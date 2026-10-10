import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import { createServer, type Server } from "node:http";

vi.mock("@workspace/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../../lib/db/src/schema");
  const client = new PGlite();
  return {
    ...schema,
    db: drizzle(client, { schema }),
    testDatabase: client,
    pool: { query: (query: { text: string }) => client.query(query.text) },
  };
});
import app from "./app";
import { createTestSchema } from "./test-schema";

// Imported goods are confirmed with the supplier (options, final price,
// minimum order, delivery) before the buyer pays.
let server: Server;
let stripe: Server;
let base: string;
let database: import("@electric-sql/pglite").PGlite;
const stripeSessions: Record<string, string>[] = [];
const saved: Record<string, string | undefined> = {};
const headers = { "Content-Type": "application/json", "X-Fotizo-Request": "1", Origin: "http://localhost:5173" };
const post = (path: string, data: unknown, cookie?: string) =>
  fetch(`${base}/api${path}`, {
    method: "POST",
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(data),
  });
const get = (path: string, cookie?: string) => fetch(`${base}/api${path}`, { headers: cookie ? { Cookie: cookie } : {} });
const json = async <T = Record<string, unknown>>(response: Response) => (await response.json()) as T;

let count = 0;
async function account(role = "buyer") {
  const email = `confirm${++count}@example.com`;
  const response = await post("/auth/register", {
    name: `User ${count}`, email, password: "valid-password", role: "buyer", acceptedTerms: true,
  });
  expect(response.status).toBe(201);
  const { id } = await json<{ id: string }>(response);
  if (role !== "buyer") await database.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  return { id, cookie: response.headers.get("set-cookie")!.split(";")[0] };
}

async function insertProduct(sellerId: string, sourced: boolean) {
  const { rows } = await database.query<{ id: string }>(
    sourced
      ? `INSERT INTO products (title, description, price, seller_id, category, stock_count, channel, images, specs,
           source_platform, source_product_id, source_url, supplier_currency, supplier_cost, supplier_rate, markup_percent, price_basis)
         VALUES ('Waist bag', 'Water-proof waist bag.', 1.95, $1, 'Shoes & Bags', 0, 'shop', ARRAY['/bag.webp'],
           '{"priceRange":"US $1.98-$2.98","minimumOrder":"20 pieces","unit":"piece"}',
           'alibaba', $2, 'https://www.alibaba.com/product-detail/_' || $2 || '.html', 'USD', 1.98, 1.3229, 30, 'quoted')
         RETURNING id`
      : `INSERT INTO products (title, description, price, seller_id, category, stock_count) VALUES ('Kettle', 'd', 20, $1, 'Home', 5) RETURNING id`,
    sourced ? [sellerId, String(1600000000 + ++count)] : [sellerId],
  );
  return rows[0].id;
}

const delivery = (country: "GH" | "GB") => ({
  name: "Ama", email: "ama@example.com", phone: "0244000000", addressLine1: "1 Road",
  addressLine2: "", city: "Accra", postalCode: "", country,
});

async function setup(paymentMethod: "pay_on_delivery" | "stripe" = "pay_on_delivery") {
  const rep = await account("china_representative");
  const seller = await account("seller");
  const buyer = await account();
  const bag = await insertProduct(rep.id, true);
  const kettle = await insertProduct(seller.id, false);
  const response = await post(
    "/orders",
    {
      items: [
        { productId: bag, quantity: 4, options: "Black, adjustable strap" },
        { productId: kettle, quantity: 1, options: "Colour: Silver" },
      ],
      delivery: delivery(paymentMethod === "stripe" ? "GB" : "GH"),
      paymentMethod,
      idempotencyKey: crypto.randomUUID(),
    },
    buyer.cookie,
  );
  expect(response.status).toBe(201);
  const placed = await json<{ orderId: string; confirmationStatus: string; checkoutUrl?: string; total: number }>(response);
  return { rep, seller, buyer, bag, kettle, placed };
}

const lines = async (orderId: string, cookie: string) =>
  (await json<{ items: { id: string; productId: string; price: number; estimatedPrice: number | null; requestedOptions: string | null; confirmedOptions: string | null; needsConfirmation: boolean; status: string }[] }>(
    await get(`/orders/${orderId}`, cookie),
  )).items;

async function quote(orderId: string, rep: { cookie: string }, buyer: { cookie: string }, bag: string) {
  const bagLine = (await lines(orderId, buyer.cookie)).find((l) => l.productId === bag)!;
  return post(
    `/operations/orders/${orderId}/quote`,
    {
      items: [{ id: bagLine.id, price: 2.5, confirmedOptions: "Black, adjustable strap (confirmed)" }],
      shipping: 12,
      deliveryDaysMin: 12,
      deliveryDaysMax: 20,
      note: "Below the supplier minimum of 20, so a small-order surcharge applies.",
    },
    rep.cookie,
  );
}

beforeAll(async () => {
  database = ((await import("@workspace/db")) as unknown as { testDatabase: typeof database }).testDatabase;
  await createTestSchema(database);
  stripe = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      stripeSessions.push(Object.fromEntries(new URLSearchParams(body)));
      const id = `cs_test_${stripeSessions.length}`;
      res.end(JSON.stringify({ id, url: `https://stripe.test/${id}` }));
    });
  });
  await new Promise<void>((resolve) => stripe.listen(0, "127.0.0.1", resolve));
  const settings = {
    STRIPE_SECRET_KEY: "sk_test_stripe",
    STRIPE_API_URL: `http://127.0.0.1:${(stripe.address() as { port: number }).port}`,
    APP_URL: "http://localhost:5173",
  };
  for (const [key, value] of Object.entries(settings)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await new Promise<void>((resolve) => stripe.close(() => resolve()));
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await database.close();
});
beforeEach(async () => {
  stripeSessions.length = 0;
  await database.exec("TRUNCATE users, sessions, auth_rate_limits, orders, order_items, products CASCADE");
});

describe("supplier confirmation for imported goods", () => {
  it("holds orders with imported goods for confirmation instead of charging the estimate", async () => {
    const { buyer, bag, kettle, placed } = await setup("stripe");
    expect(placed.confirmationStatus).toBe("awaiting");
    expect(placed.checkoutUrl).toBeUndefined();
    expect(stripeSessions).toHaveLength(0);
    const items = await lines(placed.orderId, buyer.cookie);
    expect(items.find((l) => l.productId === bag)).toMatchObject({
      needsConfirmation: true, requestedOptions: "Black, adjustable strap", estimatedPrice: 1.95,
    });
    // Options chosen for marketplace goods are kept too, so the seller ships the right one.
    expect(items.find((l) => l.productId === kettle)).toMatchObject({ needsConfirmation: false, requestedOptions: "Colour: Silver", estimatedPrice: null });
    // Payment can't be opened before the buyer accepts a confirmed total.
    expect((await post(`/payments/orders/${placed.orderId}/start`, {}, buyer.cookie)).status).toBe(409);
    // Ordered products leave the saved cart as usual.
    const cart = await json<{ needsConfirmation?: boolean; minimumOrder?: string }[]>(await get("/cart", buyer.cookie));
    expect(cart).toEqual([]);
  });

  it("shows the supplier minimum on cart lines that will be confirmed", async () => {
    const rep = await account("china_representative");
    const buyer = await account();
    const bag = await insertProduct(rep.id, true);
    await fetch(`${base}/api/cart/items/${bag}`, {
      method: "PUT",
      headers: { ...headers, Cookie: buyer.cookie },
      body: JSON.stringify({ quantity: 2 }),
    });
    const [line] = await json<{ needsConfirmation?: boolean; minimumOrder?: string }[]>(await get("/cart", buyer.cookie));
    expect(line).toMatchObject({ needsConfirmation: true, minimumOrder: "20 pieces" });
  });

  it("lets Fotizo quote final prices and delivery, then the buyer accepts and pays", async () => {
    const { rep, seller, buyer, bag, kettle, placed } = await setup("stripe");
    // Only staff see the queue, with the supplier's terms beside each line.
    expect((await get("/operations/confirmations", buyer.cookie)).status).toBe(403);
    const [queued] = await json<{ orderId: string; items: { productId: string; supplier: Record<string, unknown> | null }[] }[]>(
      await get("/operations/confirmations", rep.cookie),
    );
    expect(queued.orderId).toBe(placed.orderId);
    expect(queued.items.find((i) => i.productId === bag)!.supplier).toMatchObject({
      platform: "alibaba", minimumOrder: "20 pieces", priceRange: "US $1.98-$2.98", supplierCurrency: "USD",
    });
    expect(queued.items.find((i) => i.productId === kettle)!.supplier).toBeNull();
    // Nothing ships before the buyer accepts.
    const kettleLine = (await lines(placed.orderId, buyer.cookie)).find((l) => l.productId === kettle)!;
    expect((await post(`/sales/${kettleLine.id}/status`, { status: "processing" }, seller.cookie)).status).toBe(409);

    // Every imported line must be quoted.
    expect(
      (await post(`/operations/orders/${placed.orderId}/quote`, { items: [{ id: kettleLine.id, price: 1 }], shipping: 0, deliveryDaysMin: 1, deliveryDaysMax: 2 }, rep.cookie)).status,
    ).toBe(400);
    const quoted = await quote(placed.orderId, rep, buyer, bag);
    expect(quoted.status).toBe(200);
    // 4 x 2.50 confirmed + 1 x 20 kettle + 12 delivery.
    expect(await quoted.json()).toMatchObject({
      confirmationStatus: "quoted", subtotal: 30, shipping: 12, total: 42, deliveryDaysMin: 12, deliveryDaysMax: 20,
    });
    expect((await lines(placed.orderId, buyer.cookie)).find((l) => l.productId === bag)).toMatchObject({
      price: 2.5, estimatedPrice: 1.95, confirmedOptions: "Black, adjustable strap (confirmed)",
    });

    // Another buyer cannot accept it; the buyer accepting goes on to Stripe for the confirmed total.
    const stranger = await account();
    expect((await post(`/orders/${placed.orderId}/accept`, {}, stranger.cookie)).status).toBe(409);
    const accepted = await post(`/orders/${placed.orderId}/accept`, {}, buyer.cookie);
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({ confirmationStatus: "accepted", checkoutUrl: "https://stripe.test/cs_test_1" });
    expect(stripeSessions[0]["line_items[0][price_data][unit_amount]"]).toBe("4200");
    // Accepting twice, or re-quoting an accepted order, is refused.
    expect((await post(`/orders/${placed.orderId}/accept`, {}, buyer.cookie)).status).toBe(409);
    expect((await quote(placed.orderId, rep, buyer, bag)).status).toBe(409);
  });

  it("lets Fotizo decline with a reason and the buyer cancel, releasing reserved stock", async () => {
    const stock = async (id: string) =>
      (await database.query<{ stock_count: number }>("SELECT stock_count FROM products WHERE id = $1", [id])).rows[0].stock_count;
    const declined = await setup();
    expect(await stock(declined.kettle)).toBe(4);
    expect((await post(`/operations/orders/${declined.placed.orderId}/decline`, { reason: "" }, declined.rep.cookie)).status).toBe(400);
    const response = await post(
      `/operations/orders/${declined.placed.orderId}/decline`,
      { reason: "The supplier has discontinued this bag." },
      declined.rep.cookie,
    );
    expect(await response.json()).toMatchObject({ confirmationStatus: "declined", confirmationNote: "The supplier has discontinued this bag." });
    expect(await stock(declined.kettle)).toBe(5);
    expect((await lines(declined.placed.orderId, declined.buyer.cookie)).every((l) => l.status === "cancelled")).toBe(true);

    const withdrawn = await setup();
    await quote(withdrawn.placed.orderId, withdrawn.rep, withdrawn.buyer, withdrawn.bag);
    const cancel = await post(`/orders/${withdrawn.placed.orderId}/withdraw`, {}, withdrawn.buyer.cookie);
    expect(await cancel.json()).toMatchObject({ confirmationStatus: "withdrawn" });
    expect(await stock(withdrawn.kettle)).toBe(5);
    expect((await post(`/orders/${withdrawn.placed.orderId}/accept`, {}, withdrawn.buyer.cookie)).status).toBe(409);
  });

  it("expires quotes left unanswered and holds offline orders until accepted before marking paid", async () => {
    const manager = await account("manager");
    const { rep, buyer, bag, placed } = await setup();
    expect((await post(`/operations/orders/${placed.orderId}/payment`, { status: "paid" }, manager.cookie)).status).toBe(409);
    await quote(placed.orderId, rep, buyer, bag);
    const { releaseAbandonedOrders } = await import("./lib/payments");
    expect(await releaseAbandonedOrders()).toBe(0);
    await database.query("UPDATE orders SET quote_expires_at = now() - interval '1 minute' WHERE id = $1", [placed.orderId]);
    expect(await releaseAbandonedOrders()).toBe(1);
    expect(await json(await get(`/orders/${placed.orderId}`, buyer.cookie))).toMatchObject({ confirmationStatus: "expired" });
    expect((await post(`/orders/${placed.orderId}/accept`, {}, buyer.cookie)).status).toBe(409);

    // Pay on delivery: accepting confirms the order, after which it can be marked paid.
    const second = await setup();
    await quote(second.placed.orderId, second.rep, second.buyer, second.bag);
    expect(await json(await post(`/orders/${second.placed.orderId}/accept`, {}, second.buyer.cookie))).toMatchObject({
      confirmationStatus: "accepted",
    });
    expect((await post(`/operations/orders/${second.placed.orderId}/payment`, { status: "paid" }, manager.cookie)).status).toBe(200);
  });
});

describe("cart lines with chosen options", () => {
  it("keeps one line per product and choice of options through the cart and the order", async () => {
    const seller = await account("seller");
    const buyer = await account();
    const kettle = await insertProduct(seller.id, false);
    const put = (quantity: number, options?: string) =>
      fetch(`${base}/api/cart/items/${kettle}`, {
        method: "PUT",
        headers: { ...headers, Cookie: buyer.cookie },
        body: JSON.stringify({ quantity, ...(options ? { options } : {}) }),
      });
    expect((await put(2, "Colour: Silver")).status).toBe(204);
    expect((await put(1, "Colour: Black")).status).toBe(204);
    expect((await put(3, "Colour: Black")).status).toBe(204);
    const cart = await json<{ id: string; options?: string; quantity: number }[]>(await get("/cart", buyer.cookie));
    expect(cart.map((l) => [l.options, l.quantity]).sort()).toEqual([["Colour: Black", 3], ["Colour: Silver", 2]]);
    expect(new Set(cart.map((l) => l.id)).size).toBe(2);
    // Removing one choice leaves the other.
    await fetch(`${base}/api/cart/items/${kettle}?options=${encodeURIComponent("Colour: Black")}`, {
      method: "DELETE",
      headers: { ...headers, Cookie: buyer.cookie },
    });
    expect(await json(await get("/cart", buyer.cookie))).toMatchObject([{ options: "Colour: Silver", quantity: 2 }]);

    const order = (items: { productId: string; quantity: number; options?: string }[]) =>
      post(
        "/orders",
        { items, delivery: delivery("GH"), paymentMethod: "pay_on_delivery", idempotencyKey: crypto.randomUUID() },
        buyer.cookie,
      );
    // Stock (5) is shared by every option line of the product.
    expect(
      (await order([{ productId: kettle, quantity: 3, options: "Colour: Silver" }, { productId: kettle, quantity: 3, options: "Colour: Black" }])).status,
    ).toBe(409);
    expect((await order([{ productId: kettle, quantity: 1 }, { productId: kettle, quantity: 1 }])).status).toBe(400);
    const placed = await order([
      { productId: kettle, quantity: 2, options: "Colour: Silver" },
      { productId: kettle, quantity: 1, options: "Colour: Black" },
    ]);
    expect(placed.status).toBe(201);
    const { orderId } = await json<{ orderId: string }>(placed);
    expect((await lines(orderId, buyer.cookie)).map((l) => l.requestedOptions).sort()).toEqual(["Colour: Black", "Colour: Silver"]);
    const { rows } = await database.query<{ stock_count: number }>("SELECT stock_count FROM products WHERE id = $1", [kettle]);
    expect(rows[0].stock_count).toBe(2);
  });
});
