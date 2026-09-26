import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
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
import { resetCurrencyCache } from "./routes/currency";

let server: Server;
let base: string;
let database: import("@electric-sql/pglite").PGlite;
const headers = {
  "Content-Type": "application/json",
  "X-Fotizo-Request": "1",
  Origin: "http://localhost:5173",
};
const post = (path: string, data: unknown = {}, cookie?: string) =>
  fetch(`${base}/api${path}`, {
    method: "POST",
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(data),
  });
const get = (path: string, cookie?: string) =>
  fetch(`${base}/api${path}`, { headers: cookie ? { Cookie: cookie } : {} });

let emailCount = 0;
async function account(role = "buyer") {
  const email = `user${++emailCount}@example.com`;
  const response = await post("/auth/register", {
    name: `User ${emailCount}`,
    email,
    password: "valid-password",
    role: "buyer",
    acceptedTerms: true,
  });
  expect(response.status).toBe(201);
  const { id } = (await response.json()) as { id: string };
  // Staff roles are assigned server-side; the session reads the current role.
  if (role !== "buyer")
    await database.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  return { id, cookie: response.headers.get("set-cookie")!.split(";")[0] };
}

async function vehicle(slug: string, status = "active") {
  const { rows } = await database.query<{ id: string }>(
    `INSERT INTO vehicles (slug, make, model, body_type, fuel, seats, transmission, drivetrain, powertrain,
      efficiency, landed_price, lead_time_min_weeks, lead_time_max_weeks, images, highlights, description, status)
     VALUES ($1, 'Make', $1, 'suv', 'hybrid', 5, 'Automatic', 'AWD', '2.0L hybrid', '5 L/100km', 25000, 8, 12,
      ARRAY['https://example.com/a.jpg'], ARRAY['Roomy'], 'A vehicle', $2) RETURNING id`,
    [slug, status],
  );
  return rows[0].id;
}

const supportInput = {
  topic: "not-received",
  orderRef: "FZ-1",
  name: "Ama",
  email: "Ama@Example.com",
  phone: "",
  message: "My parcel has not arrived.",
};
const enquiryInput = (vehicleId: string) => ({
  vehicleId,
  name: "Kofi",
  email: "kofi@example.com",
  phone: "0244000000",
  destination: "Ghana",
  message: "",
});

beforeAll(async () => {
  database = (
    (await import("@workspace/db")) as unknown as { testDatabase: typeof database }
  ).testDatabase;
  await createTestSchema(database);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await database?.close();
});
beforeEach(async () => {
  await database.exec(
    "TRUNCATE users, sessions, auth_rate_limits, support_requests, vehicle_enquiries, vehicles, case_events, orders, order_items, products, services CASCADE",
  );
});

describe("support requests", () => {
  it("stores a public request with a reference and links a signed-in customer", async () => {
    const anonymous = await post("/support-requests", supportInput);
    expect(anonymous.status).toBe(201);
    const created = (await anonymous.json()) as { reference: string; email: string };
    expect(created.reference).toMatch(/^FZS-[2-9A-HJKMNP-Z]{8}$/);
    expect(created.email).toBe("ama@example.com");

    const customer = await account();
    expect((await post("/support-requests", supportInput, customer.cookie)).status).toBe(201);
    const { rows } = await database.query<{ user_id: string | null }>(
      "SELECT user_id FROM support_requests ORDER BY created_at",
    );
    expect(rows.map((r) => r.user_id)).toEqual([null, customer.id]);
  });

  it("rejects invalid, unknown and oversized fields without storing them", async () => {
    for (const body of [
      { ...supportInput, topic: "lottery" },
      { ...supportInput, email: "not-an-email" },
      { ...supportInput, message: "   " },
      { ...supportInput, message: "x".repeat(4001) },
      { ...supportInput, status: "resolved" },
    ])
      expect((await post("/support-requests", body)).status).toBe(400);
    const { rows } = await database.query("SELECT 1 FROM support_requests");
    expect(rows).toHaveLength(0);
  });

  it("limits repeated submissions from one connection", async () => {
    for (let i = 0; i < 10; i++)
      expect((await post("/support-requests", supportInput)).status).toBe(201);
    const limited = await post("/support-requests", supportInput);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("lets managers work the queue with versioned, audited transitions", async () => {
    const created = (await (await post("/support-requests", supportInput)).json()) as { id: string };
    const manager = await account("manager");
    const representative = await account("representative");
    expect((await get("/operations/support-requests")).status).toBe(401);
    expect((await get("/operations/support-requests", representative.cookie)).status).toBe(403);

    const queue = (await (await get("/operations/support-requests?status=open", manager.cookie)).json()) as {
      items: { id: string; statusVersion: number }[];
    };
    expect(queue.items.map((i) => i.id)).toEqual([created.id]);

    const path = `/operations/support-requests/${created.id}/status`;
    const change = { status: "in_progress", expectedVersion: 0, note: "Tracing with the hub" };
    const [first, second] = await Promise.all([
      post(path, change, manager.cookie),
      post(path, change, manager.cookie),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect((await post(path, { status: "in_progress", expectedVersion: 1 }, manager.cookie)).status).toBe(400);
    expect((await post(path, { status: "resolved", expectedVersion: 1 }, manager.cookie)).status).toBe(200);

    const events = (await (await get(`/operations/support-requests/${created.id}/events`, manager.cookie)).json()) as {
      fromStatus: string;
      toStatus: string;
      note: string;
    }[];
    expect(events.map((e) => [e.fromStatus, e.toStatus, e.note])).toEqual([
      ["open", "in_progress", "Tracing with the hub"],
      ["in_progress", "resolved", ""],
    ]);
    expect((await post(`/operations/support-requests/${crypto.randomUUID()}/status`, change, manager.cookie)).status).toBe(404);
  });
});

describe("vehicles and enquiries", () => {
  it("serves only published vehicles and snapshots the enquiry", async () => {
    const listed = await vehicle("byd-atto-3");
    const hidden = await vehicle("hidden-car", "unpublished");
    const list = (await (await get("/vehicles")).json()) as { id: string; leadTimeWeeks: number[] }[];
    expect(list.map((v) => v.id)).toEqual([listed]);
    expect(list[0].leadTimeWeeks).toEqual([8, 12]);
    expect((await get("/vehicles/byd-atto-3")).status).toBe(200);
    expect((await get("/vehicles/hidden-car")).status).toBe(404);

    expect((await post("/vehicle-enquiries", enquiryInput(hidden))).status).toBe(404);
    expect((await post("/vehicle-enquiries", { ...enquiryInput(listed), phone: "" })).status).toBe(400);
    const created = await post("/vehicle-enquiries", enquiryInput(listed));
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      vehicleName: "Make byd-atto-3",
      reference: expect.stringMatching(/^FZV-/),
    });
    await database.query("UPDATE vehicles SET landed_price = 99999 WHERE id = $1", [listed]);
    const { rows } = await database.query<{ quoted_landed_price: string }>(
      "SELECT quoted_landed_price FROM vehicle_enquiries",
    );
    expect(Number(rows[0].quoted_landed_price)).toBe(25000);
  });

  it("gives the China desk the enquiry queue and vehicle publishing, and no one else", async () => {
    const id = await vehicle("haval-h6");
    await post("/vehicle-enquiries", enquiryInput(id));
    const desk = await account("china_representative");
    const buyer = await account();
    expect((await get("/operations/vehicle-enquiries", buyer.cookie)).status).toBe(403);
    expect((await get("/operations/support-requests", desk.cookie)).status).toBe(403);
    const queue = (await (await get("/operations/vehicle-enquiries", desk.cookie)).json()) as {
      items: { id: string }[];
    };
    expect(queue.items).toHaveLength(1);
    expect(
      (await post(`/operations/vehicle-enquiries/${queue.items[0].id}/status`, { status: "quoted", expectedVersion: 0 }, desk.cookie)).status,
    ).toBe(200);

    expect((await post(`/operations/vehicles/${id}/status`, { status: "unpublished" }, buyer.cookie)).status).toBe(403);
    expect((await post(`/operations/vehicles/${id}/status`, { status: "unpublished" }, desk.cookie)).status).toBe(200);
    expect(await (await get("/vehicles")).json()).toEqual([]);
    const all = (await (await get("/operations/vehicles", desk.cookie)).json()) as { status: string }[];
    expect(all.map((v) => v.status)).toEqual(["unpublished"]);
  });
});

describe("operations reporting", () => {
  it("computes overview figures from stored records for permitted staff only", async () => {
    const seller = await account("seller");
    const buyer = await account();
    await database.query(
      `INSERT INTO products (title, description, price, seller_id, category, stock_count, channel, status) VALUES
       ('Kettle', 'd', 20, $1, 'Home', 2, 'marketplace', 'active'),
       ('Lamp', 'd', 30, $1, 'Home', 10, 'marketplace', 'active'),
       ('Wig', 'd', 40, $1, 'Beauty', 10, 'shop', 'active'),
       ('Old', 'd', 40, $1, 'Home', 10, 'marketplace', 'unpublished')`,
      [seller.id],
    );
    const { rows: products } = await database.query<{ id: string }>("SELECT id FROM products WHERE title = 'Kettle'");
    const { rows: orders } = await database.query<{ id: string }>(
      "INSERT INTO orders (buyer_id, total) VALUES ($1, 100) RETURNING id",
      [buyer.id],
    );
    await database.query(
      `INSERT INTO order_items (order_id, product_id, product_title, product_image, seller_id, seller, price, quantity, status) VALUES
       ($1, $2, 'Kettle', '', $3, 'Seller', 20, 2, 'pending'),
       ($1, $2, 'Kettle', '', $3, 'Seller', 20, 3, 'cancelled')`,
      [orders[0].id, products[0].id, seller.id],
    );
    await post("/support-requests", supportInput);

    expect((await get("/operations/overview", buyer.cookie)).status).toBe(403);
    const representative = await account("representative");
    const overview = (await (await get("/operations/overview", representative.cookie)).json()) as {
      users: { buyers: number; sellers: number };
      listings: { marketplace: number; shop: number; unpublished: number; lowStock: number };
      orders: { lines: number; value: number; valueThisMonth: number; monthly: { value: number }[] };
      topCategories: { category: string; listings: number }[];
      support: { open: number };
    };
    expect(overview.users).toMatchObject({ buyers: 1, sellers: 1 });
    expect(overview.listings).toMatchObject({ marketplace: 2, shop: 1, unpublished: 1, lowStock: 1 });
    expect(overview.orders).toMatchObject({ lines: 2, value: 40, valueThisMonth: 40 });
    expect(overview.orders.monthly).toHaveLength(6);
    expect(overview.orders.monthly.at(-1)!.value).toBe(40);
    expect(overview.topCategories).toEqual([{ category: "Home", listings: 2 }]);
    expect(overview.support.open).toBe(1);

    const sellers = (await (await get("/operations/sellers", representative.cookie)).json()) as {
      items: { id: string; activeListings: number; orderValue: number }[];
    };
    expect(sellers.items).toEqual([
      expect.objectContaining({ id: seller.id, activeListings: 3, orderValue: 40 }),
    ]);
    const orderPage = (await (await get("/operations/orders", representative.cookie)).json()) as {
      items: { buyer: string; total: number }[];
    };
    expect(orderPage.items.map((o) => o.total).sort()).toEqual([40, 60]);
    expect((await get("/operations/sellers?page=-1", representative.cookie)).status).toBe(400);
    const desk = await account("china_representative");
    expect((await get("/operations/sellers", desk.cookie)).status).toBe(403);
  });

  it("reports measured request statistics to developers without concrete IDs or queries", async () => {
    const developer = await account("developer");
    const buyer = await account();
    await get(`/vehicles/some-slug?secret=value`);
    expect((await get("/developer/stats", buyer.cookie)).status).toBe(403);
    const stats = (await (await get("/developer/stats", developer.cookie)).json()) as {
      requests: number;
      hourly: unknown[];
      recent: { route: string }[];
      database: { ready: boolean };
    };
    expect(stats.requests).toBeGreaterThan(0);
    expect(stats.hourly).toHaveLength(24);
    expect(stats.database.ready).toBe(true);
    const routes = stats.recent.map((r) => r.route);
    expect(routes).toContain("/api/vehicles/:slug");
    expect(JSON.stringify(stats.recent)).not.toMatch(/some-slug|secret/);
  });
});

describe("currency rates", () => {
  it("serves validated rates, and 503 rather than invented values when the source fails", async () => {
    let reply: { status: number; body: unknown } = {
      status: 200,
      body: { rates: { USD: 1.27, GHS: 19.5, EUR: 1.17 } },
    };
    const source = createServer((_req, res) => {
      res.writeHead(reply.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(reply.body));
    });
    await new Promise<void>((resolve) => source.listen(0, "127.0.0.1", resolve));
    process.env.CURRENCY_RATES_URL = `http://127.0.0.1:${(source.address() as { port: number }).port}`;
    try {
      resetCurrencyCache();
      const ok = await get("/currency/rates");
      expect(ok.status).toBe(200);
      expect(await ok.json()).toEqual({ GBP: 1, USD: 1.27, GHS: 19.5 });

      for (const failure of [
        { status: 500, body: {} },
        { status: 200, body: { rates: { USD: -1, GHS: 19 } } },
      ]) {
        reply = failure;
        resetCurrencyCache();
        expect((await get("/currency/rates")).status).toBe(503);
      }
    } finally {
      delete process.env.CURRENCY_RATES_URL;
      resetCurrencyCache();
      await new Promise<void>((resolve) => source.close(() => resolve()));
    }
  });
});

describe("catalogue best-selling sort", () => {
  it("orders shop listings by recorded units sold, treating missing counts as zero", async () => {
    const rep = await account("china_representative");
    await database.query(
      `INSERT INTO products (title, description, price, seller_id, category, stock_count, channel, specs) VALUES
       ('Few', 'd', 5, $1, 'phones', 3, 'shop', '{"unitsSold":"12"}'),
       ('Many', 'd', 5, $1, 'phones', 3, 'shop', '{"unitsSold":"1800"}'),
       ('Unknown', 'd', 5, $1, 'phones', 3, 'shop', '{"unitsSold":"n/a"}')`,
      [rep.id],
    );
    const response = await get("/products?channel=shop&sort=best-selling");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: { title: string }[] };
    expect(body.items.map((p) => p.title)).toEqual(["Many", "Few", "Unknown"]);
  });
});

describe("wishlist", () => {
  const put = (path: string, cookie?: string) =>
    fetch(`${base}/api${path}`, { method: "PUT", headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) } });
  const del = (path: string, cookie?: string) =>
    fetch(`${base}/api${path}`, { method: "DELETE", headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) } });

  it("saves published products per account, idempotently, and hides unpublished ones", async () => {
    const seller = await account("seller");
    const { rows } = await database.query<{ id: string; title: string }>(
      `INSERT INTO products (title, description, price, seller_id, category, stock_count, status) VALUES
       ('Kettle', 'd', 20, $1, 'Home', 2, 'active'),
       ('Lamp', 'd', 30, $1, 'Home', 2, 'active'),
       ('Hidden', 'd', 30, $1, 'Home', 2, 'unpublished') RETURNING id, title`,
      [seller.id],
    );
    const [kettle, lamp, hidden] = rows;
    const alice = await account();
    const bob = await account();
    expect((await get("/wishlist")).status).toBe(401);
    expect((await put(`/wishlist/${kettle.id}`)).status).toBe(401);

    expect((await put(`/wishlist/${kettle.id}`, alice.cookie)).status).toBe(204);
    expect((await put(`/wishlist/${kettle.id}`, alice.cookie)).status).toBe(204);
    expect((await put(`/wishlist/${lamp.id}`, alice.cookie)).status).toBe(204);
    expect((await put(`/wishlist/${hidden.id}`, alice.cookie)).status).toBe(404);
    expect((await put(`/wishlist/not-a-uuid`, alice.cookie)).status).toBe(404);

    const saved = (await (await get("/wishlist", alice.cookie)).json()) as { title: string }[];
    expect(saved.map((p) => p.title).sort()).toEqual(["Kettle", "Lamp"]);
    expect(await (await get("/wishlist", bob.cookie)).json()).toEqual([]);

    await database.query("UPDATE products SET status = 'unpublished' WHERE id = $1", [lamp.id]);
    expect(((await (await get("/wishlist", alice.cookie)).json()) as { title: string }[]).map((p) => p.title)).toEqual(["Kettle"]);

    expect((await del(`/wishlist/${kettle.id}`, alice.cookie)).status).toBe(204);
    expect(await (await get("/wishlist", alice.cookie)).json()).toEqual([]);
  });
});

describe("checkout with offline payment", () => {
  const delivery = {
    name: "Ama Mensah",
    email: "ama@example.com",
    phone: "0244000000",
    addressLine1: "12 Ring Road",
    addressLine2: "",
    city: "Accra",
    postalCode: "",
    country: "GH",
  };
  async function catalogue() {
    const seller = await account("seller");
    const rep = await account("china_representative");
    const { rows } = await database.query<{ id: string; title: string }>(
      `INSERT INTO products (title, description, price, seller_id, category, stock_count, channel) VALUES
       ('Kettle', 'd', 20, $1, 'Home', 3, 'marketplace'),
       ('Wig', 'd', 40, $2, 'wigs', 0, 'shop') RETURNING id, title`,
      [seller.id, rep.id],
    );
    return { seller, kettle: rows[0].id, wig: rows[1].id };
  }
  const order = (items: { productId: string; quantity: number }[], key = crypto.randomUUID()) => ({
    items,
    delivery,
    paymentMethod: "pay_on_delivery",
    idempotencyKey: key,
  });

  it("prices on the server, reserves marketplace stock and snapshots delivery", async () => {
    const { kettle, wig } = await catalogue();
    const buyer = await account();
    expect((await post("/orders", order([{ productId: kettle, quantity: 1 }]))).status).toBe(401);
    const response = await post(
      "/orders",
      order([
        { productId: kettle, quantity: 2 },
        { productId: wig, quantity: 1 },
      ]),
      buyer.cookie,
    );
    expect(response.status).toBe(201);
    const placed = (await response.json()) as { orderId: string; reference: string; total: number; shipping: number };
    // 2 x 20 + 1 x 40 = 80, above the free-delivery threshold.
    expect(placed).toMatchObject({ total: 80, shipping: 0, reference: expect.stringMatching(/^FTZ-/) });
    const { rows } = await database.query<{ stock_count: number; title: string }>(
      "SELECT title, stock_count FROM products ORDER BY title",
    );
    // Marketplace stock is reserved; shop goods are sourced to order.
    expect(rows).toEqual([
      { title: "Kettle", stock_count: 1 },
      { title: "Wig", stock_count: 0 },
    ]);
    const detail = (await (await get(`/orders/${placed.orderId}`, buyer.cookie)).json()) as {
      delivery: { city: string };
      paymentStatus: string;
      items: unknown[];
    };
    expect(detail).toMatchObject({ delivery: { city: "Accra" }, paymentStatus: "unpaid" });
    expect(detail.items).toHaveLength(2);
    const other = await account();
    expect((await get(`/orders/${placed.orderId}`, other.cookie)).status).toBe(404);
  });

  it("charges delivery on small orders and refuses stock it does not have", async () => {
    const { kettle } = await catalogue();
    const buyer = await account();
    const small = (await (await post("/orders", order([{ productId: kettle, quantity: 1 }]), buyer.cookie)).json()) as {
      total: number;
      shipping: number;
    };
    expect(small).toMatchObject({ shipping: 5.99, total: 25.99 });
    const tooMany = await post("/orders", order([{ productId: kettle, quantity: 3 }]), buyer.cookie);
    expect(tooMany.status).toBe(409);
    expect(((await tooMany.json()) as { error: string }).error).toContain("Only 2");
  });

  it("returns the same order for a retried submission and never double-reserves", async () => {
    const { kettle } = await catalogue();
    const buyer = await account();
    const body = order([{ productId: kettle, quantity: 1 }]);
    const [a, b] = await Promise.all([post("/orders", body, buyer.cookie), post("/orders", body, buyer.cookie)]);
    const ids = [(await a.json()) as { orderId: string }, (await b.json()) as { orderId: string }].map((o) => o.orderId);
    expect(ids[0]).toBe(ids[1]);
    const { rows } = await database.query<{ n: number }>("SELECT count(*)::int n FROM orders");
    expect(rows[0].n).toBe(1);
    const stock = await database.query<{ stock_count: number }>("SELECT stock_count FROM products WHERE id = $1", [kettle]);
    expect(stock.rows[0].stock_count).toBe(2);
  });

  it("refuses sellers buying their own listing and unknown fields", async () => {
    const { seller, kettle } = await catalogue();
    expect((await post("/orders", order([{ productId: kettle, quantity: 1 }]), seller.cookie)).status).toBe(409);
    const buyer = await account();
    expect(
      (await post("/orders", { ...order([{ productId: kettle, quantity: 1 }]), total: 1 }, buyer.cookie)).status,
    ).toBe(400);
  });

  it("lets the seller progress their line, restocks cancellations, and lets managers record payment", async () => {
    const { seller, kettle } = await catalogue();
    const buyer = await account();
    const placed = (await (await post("/orders", order([{ productId: kettle, quantity: 2 }]), buyer.cookie)).json()) as {
      orderId: string;
    };
    const [line] = (await (await get("/sales", seller.cookie)).json()) as { id: string; status: string }[];
    expect(line.status).toBe("pending");
    expect((await post(`/sales/${line.id}/status`, { status: "processing" }, buyer.cookie)).status).toBe(404);
    expect((await post(`/sales/${line.id}/status`, { status: "delivered" }, seller.cookie)).status).toBe(409);
    expect((await post(`/sales/${line.id}/status`, { status: "processing" }, seller.cookie)).status).toBe(200);
    expect(
      (await post(`/sales/${line.id}/status`, { status: "shipped", trackingNumber: "TRK-1" }, seller.cookie)).status,
    ).toBe(200);
    const [shipped] = (await (await get("/orders", buyer.cookie)).json()) as { status: string; trackingNumber: string }[];
    expect(shipped).toMatchObject({ status: "shipped", trackingNumber: "TRK-1" });

    const second = (await (await post("/orders", order([{ productId: kettle, quantity: 1 }]), buyer.cookie)).json()) as {
      orderId: string;
    };
    const lines = (await (await get("/sales", seller.cookie)).json()) as { id: string; orderId: string }[];
    const pendingLine = lines.find((l) => l.orderId === second.orderId)!;
    expect((await post(`/sales/${pendingLine.id}/status`, { status: "cancelled" }, seller.cookie)).status).toBe(200);
    const stock = await database.query<{ stock_count: number }>("SELECT stock_count FROM products WHERE id = $1", [kettle]);
    expect(stock.rows[0].stock_count).toBe(1);

    const manager = await account("manager");
    const pay = `/operations/orders/${placed.orderId}/payment`;
    expect((await post(pay, { status: "paid" }, seller.cookie)).status).toBe(403);
    expect((await post(pay, { status: "paid" }, manager.cookie)).status).toBe(200);
    expect((await post(pay, { status: "paid" }, manager.cookie)).status).toBe(409);
    const detail = (await (await get(`/orders/${placed.orderId}`, buyer.cookie)).json()) as { paymentStatus: string };
    expect(detail.paymentStatus).toBe("paid");
  });
});

describe("service booking requests", () => {
  async function service() {
    const provider = await account("seller");
    const { rows } = await database.query<{ id: string }>(
      `INSERT INTO services (title, description, provider_id, avatar, experience, hourly_rate, category, "group", availability, packages)
       VALUES ('Braiding', 'd', $1, '', '5 years', 20, 'hair', 'artisans', 'Weekdays',
       '[{"name":"Basic","price":30,"delivery":"1 day","description":"d"}]') RETURNING id`,
      [provider.id],
    );
    return { provider, serviceId: rows[0].id };
  }
  const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const request = (serviceId: string, scheduledFor = tomorrow()) => ({
    serviceId,
    packageName: "Basic",
    scheduledFor,
    timezone: "Africa/Accra",
    notes: "Box braids please",
  });

  it("records a request with a price snapshot for both sides to see", async () => {
    const { provider, serviceId } = await service();
    const customer = await account();
    expect((await post("/bookings", request(serviceId))).status).toBe(401);
    const created = await post("/bookings", request(serviceId), customer.cookie);
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      reference: expect.stringMatching(/^FZB-/),
      status: "requested",
      price: 30,
      package: "Basic",
      serviceTitle: "Braiding",
    });
    await database.query(`UPDATE services SET packages = '[{"name":"Basic","price":99,"delivery":"1 day","description":"d"}]'`);
    const mine = (await (await get("/bookings", customer.cookie)).json()) as { price: number }[];
    expect(mine.map((b) => b.price)).toEqual([30]);
    const incoming = (await (await get("/provider/bookings", provider.cookie)).json()) as { buyer: string }[];
    expect(incoming).toHaveLength(1);
    expect(await (await get("/provider/bookings", customer.cookie)).json()).toEqual([]);
  });

  it("rejects past times, unknown packages, self-booking and duplicate open requests", async () => {
    const { provider, serviceId } = await service();
    const customer = await account();
    expect((await post("/bookings", request(serviceId, new Date(Date.now() - 60_000).toISOString()), customer.cookie)).status).toBe(400);
    expect((await post("/bookings", { ...request(serviceId), packageName: "Deluxe" }, customer.cookie)).status).toBe(409);
    expect((await post("/bookings", request(serviceId), provider.cookie)).status).toBe(409);
    const when = tomorrow();
    expect((await post("/bookings", request(serviceId, when), customer.cookie)).status).toBe(201);
    expect((await post("/bookings", request(serviceId, when), customer.cookie)).status).toBe(409);
  });

  it("lets the provider decide and the customer withdraw, with versioned changes", async () => {
    const { provider, serviceId } = await service();
    const customer = await account();
    const stranger = await account();
    const booking = (await (await post("/bookings", request(serviceId), customer.cookie)).json()) as { id: string };
    const path = `/bookings/${booking.id}/status`;
    expect((await post(path, { status: "confirmed", expectedVersion: 0 }, stranger.cookie)).status).toBe(404);
    expect((await post(path, { status: "confirmed", expectedVersion: 0 }, customer.cookie)).status).toBe(409);
    const [a, b] = await Promise.all([
      post(path, { status: "confirmed", expectedVersion: 0, meetingLink: "https://meet.example.com/x" }, provider.cookie),
      post(path, { status: "declined", expectedVersion: 0 }, provider.cookie),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const [current] = (await (await get("/bookings", customer.cookie)).json()) as { status: string; statusVersion: number }[];
    expect(current.statusVersion).toBe(1);
    if (current.status === "confirmed")
      expect((await post(path, { status: "cancelled", expectedVersion: 1 }, customer.cookie)).status).toBe(200);
    else expect((await post(path, { status: "cancelled", expectedVersion: 1 }, customer.cookie)).status).toBe(409);
  });
});

describe("saved cart", () => {
  const put = (path: string, data: unknown, cookie?: string) =>
    fetch(`${base}/api${path}`, {
      method: "PUT",
      headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(data),
    });
  const del = (path: string, cookie?: string) =>
    fetch(`${base}/api${path}`, { method: "DELETE", headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) } });
  async function products() {
    const seller = await account("seller");
    const { rows } = await database.query<{ id: string }>(
      `INSERT INTO products (title, description, price, seller_id, category, stock_count, status) VALUES
       ('Kettle', 'd', 20, $1, 'Home', 5, 'active'),
       ('Lamp', 'd', 30, $1, 'Home', 5, 'active'),
       ('Hidden', 'd', 9, $1, 'Home', 5, 'unpublished') RETURNING id`,
      [seller.id],
    );
    return rows.map((r) => r.id);
  }

  it("keeps each account's cart on the server with live prices", async () => {
    const [kettle, lamp, hidden] = await products();
    const alice = await account();
    const bob = await account();
    expect((await get("/cart")).status).toBe(401);
    expect((await put(`/cart/items/${kettle}`, { quantity: 2 }, alice.cookie)).status).toBe(204);
    expect((await put(`/cart/items/${kettle}`, { quantity: 3 }, alice.cookie)).status).toBe(204);
    expect((await put(`/cart/items/${lamp}`, { quantity: 1 }, alice.cookie)).status).toBe(204);
    expect((await put(`/cart/items/${hidden}`, { quantity: 1 }, alice.cookie)).status).toBe(404);
    expect((await put(`/cart/items/${lamp}`, { quantity: 100 }, alice.cookie)).status).toBe(400);
    await database.query("UPDATE products SET price = 25 WHERE id = $1", [kettle]);
    const cart = (await (await get("/cart", alice.cookie)).json()) as { productId: string; quantity: number; price: number }[];
    expect(cart.map((i) => [i.productId, i.quantity, i.price])).toEqual([
      [kettle, 3, 25],
      [lamp, 1, 30],
    ]);
    expect(await (await get("/cart", bob.cookie)).json()).toEqual([]);
    expect((await del(`/cart/items/${lamp}`, alice.cookie)).status).toBe(204);
    expect(((await (await get("/cart", alice.cookie)).json()) as unknown[]).length).toBe(1);
    expect((await del("/cart", alice.cookie)).status).toBe(204);
    expect(await (await get("/cart", alice.cookie)).json()).toEqual([]);
  });

  it("merges a signed-out cart by adding quantities and skipping unavailable products", async () => {
    const [kettle, lamp, hidden] = await products();
    const alice = await account();
    await put(`/cart/items/${kettle}`, { quantity: 98 }, alice.cookie);
    const merged = (await (
      await post(
        "/cart/merge",
        {
          items: [
            { productId: kettle, quantity: 5 },
            { productId: lamp, quantity: 2 },
            { productId: hidden, quantity: 1 },
          ],
        },
        alice.cookie,
      )
    ).json()) as { productId: string; quantity: number }[];
    expect(merged.map((i) => [i.productId, i.quantity])).toEqual([
      [kettle, 99],
      [lamp, 2],
    ]);
  });

  it("empties ordered products from the saved cart when the order is placed", async () => {
    const [kettle, lamp] = await products();
    const alice = await account();
    await put(`/cart/items/${kettle}`, { quantity: 1 }, alice.cookie);
    await put(`/cart/items/${lamp}`, { quantity: 1 }, alice.cookie);
    const placed = await post(
      "/orders",
      {
        items: [{ productId: kettle, quantity: 1 }],
        delivery: {
          name: "Ama", email: "ama@example.com", phone: "0244000000", addressLine1: "1 Road",
          addressLine2: "", city: "Accra", postalCode: "", country: "GH",
        },
        paymentMethod: "pay_on_delivery",
        idempotencyKey: crypto.randomUUID(),
      },
      alice.cookie,
    );
    expect(placed.status).toBe(201);
    const cart = (await (await get("/cart", alice.cookie)).json()) as { productId: string }[];
    expect(cart.map((i) => i.productId)).toEqual([lamp]);
  });
});

describe("provider service management", () => {
  const patch = (path: string, data: unknown, cookie?: string) =>
    fetch(`${base}/api${path}`, {
      method: "PATCH",
      headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(data),
    });
  const listing = {
    title: "Box braids",
    category: "plumbing",
    description: "Neat, long-lasting box braids for all hair types.",
    experience: "5 years",
    hourlyRate: 25,
    availability: "Weekdays",
    skills: ["Braiding"],
    avatar: "data:image/png;base64,iVBORw0KGgo=",
    packages: [{ name: "Basic", price: 30, delivery: "1 day", description: "Shoulder length" }],
  };

  it("lets only the owner see, edit, withdraw and republish a service", async () => {
    const provider = await account("seller");
    const other = await account("seller");
    const created = (await (await post("/services", listing, provider.cookie)).json()) as { id: string };
    const id = created.id;

    const edited = await patch(`/services/${id}`, { ...listing, title: "Knotless braids", hourlyRate: 30 }, provider.cookie);
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({ title: "Knotless braids", hourlyRate: 30, status: "active" });
    expect((await patch(`/services/${id}`, { ...listing, title: "Stolen" }, other.cookie)).status).toBe(404);
    expect((await patch(`/services/${id}`, { ...listing, rating: 5 }, provider.cookie)).status).toBe(400);
    expect((await get(`/provider/services/${id}`, other.cookie)).status).toBe(404);

    expect((await post(`/services/${id}/status`, { status: "unpublished" }, other.cookie)).status).toBe(404);
    expect((await post(`/services/${id}/status`, { status: "unpublished" }, provider.cookie)).status).toBe(200);
    expect((await get(`/services/${id}`)).status).toBe(404);
    const mine = (await (await get("/provider/services", provider.cookie)).json()) as { id: string; status: string }[];
    expect(mine).toEqual([expect.objectContaining({ id, status: "unpublished" })]);
    expect(await (await get("/provider/services", other.cookie)).json()).toEqual([]);

    expect((await post(`/services/${id}/status`, { status: "active" }, provider.cookie)).status).toBe(200);
    expect((await get(`/services/${id}`)).status).toBe(200);
  });
});

describe("online payment (Paystack and Stripe)", () => {
  // A local stand-in for Paystack, Stripe and the exchange-rate feed.
  const stub = {
    paystackInit: [] as Record<string, unknown>[],
    stripeSessions: [] as Record<string, string>[],
    paystackVerify: null as null | { status: string; amount?: number; currency?: string },
    stripeSession: null as null | Record<string, unknown>,
    down: false,
  };
  let provider: Server;
  const saved: Record<string, string | undefined> = {};
  const settings = (url: string) => ({
    PAYSTACK_SECRET_KEY: "sk_test_paystack",
    STRIPE_SECRET_KEY: "sk_test_stripe",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    PAYSTACK_API_URL: url,
    STRIPE_API_URL: url,
    CURRENCY_RATES_URL: `${url}/rates`,
    APP_URL: "http://localhost:5173",
  });

  beforeAll(async () => {
    provider = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const send = (status: number, data: unknown) => {
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(data));
        };
        if (stub.down) return send(500, {});
        const url = req.url ?? "";
        if (url === "/rates") return send(200, { rates: { USD: 1.3, GHS: 15 } });
        if (url === "/transaction/initialize") {
          const parsed = JSON.parse(body) as Record<string, unknown>;
          stub.paystackInit.push(parsed);
          return send(200, { status: true, data: { authorization_url: `https://paystack.test/${parsed.reference}` } });
        }
        if (url.startsWith("/transaction/verify/")) return send(200, { status: true, data: stub.paystackVerify ?? { status: "abandoned" } });
        if (url === "/v1/checkout/sessions") {
          const form = Object.fromEntries(new URLSearchParams(body));
          stub.stripeSessions.push(form);
          const id = `cs_test_${stub.stripeSessions.length}`;
          return send(200, { id, url: `https://stripe.test/${id}` });
        }
        if (url.startsWith("/v1/checkout/sessions/")) return send(200, stub.stripeSession ?? { payment_status: "unpaid", status: "open" });
        send(404, {});
      });
    });
    await new Promise<void>((resolve) => provider.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${(provider.address() as { port: number }).port}`;
    for (const [key, value] of Object.entries(settings(url))) {
      saved[key] = process.env[key];
      process.env[key] = value;
    }
  });
  afterAll(async () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetCurrencyCache();
    await new Promise<void>((resolve) => provider.close(() => resolve()));
  });
  beforeEach(() => {
    stub.paystackInit = [];
    stub.stripeSessions = [];
    stub.paystackVerify = null;
    stub.stripeSession = null;
    stub.down = false;
    resetCurrencyCache();
  });

  const delivery = (country: string) => ({
    name: "Ama", email: "ama@example.com", phone: "0244000000", addressLine1: "1 Road",
    addressLine2: "", city: "Accra", postalCode: "", country,
  });
  async function checkout(country: "GH" | "GB", paymentMethod: "paystack" | "stripe") {
    const seller = await account("seller");
    const buyer = await account();
    const { rows } = await database.query<{ id: string }>(
      `INSERT INTO products (title, description, price, seller_id, category, stock_count) VALUES ('Kettle', 'd', 20, $1, 'Home', 5) RETURNING id`,
      [seller.id],
    );
    const response = await post(
      "/orders",
      {
        items: [{ productId: rows[0].id, quantity: 3 }],
        delivery: delivery(country),
        paymentMethod,
        idempotencyKey: crypto.randomUUID(),
      },
      buyer.cookie,
    );
    return { response, buyer, productId: rows[0].id };
  }
  const paidStatus = async (orderId: string) =>
    (await database.query<{ payment_status: string }>("SELECT payment_status FROM orders WHERE id = $1", [orderId])).rows[0].payment_status;
  const rawPost = (path: string, body: string, extra: Record<string, string>) =>
    fetch(`${base}/api${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...extra }, body });

  it("advertises the configured providers and refuses the wrong one for the country", async () => {
    expect(await (await get("/payments/config")).json()).toEqual({ paystack: true, stripe: true });
    const { response } = await checkout("GB", "paystack");
    expect(response.status).toBe(400);
  });

  it("charges Ghana orders in cedis through Paystack and confirms on return", async () => {
    const { response, buyer } = await checkout("GH", "paystack");
    expect(response.status).toBe(201);
    const placed = (await response.json()) as { orderId: string; total: number; checkoutUrl: string };
    // 3 x GBP 20 = GBP 60 (free delivery) -> GHS 900.00 at the locked rate of 15.
    expect(placed.total).toBe(60);
    expect(placed.checkoutUrl).toMatch(/^https:\/\/paystack\.test\/FZP-/);
    expect(stub.paystackInit[0]).toMatchObject({
      email: "ama@example.com",
      amount: 90000,
      currency: "GHS",
      callback_url: `http://localhost:5173/order-confirmation?order=${placed.orderId}`,
    });
    expect(await paidStatus(placed.orderId)).toBe("unpaid");

    // A browser redirect alone proves nothing: the provider still says unpaid.
    const unpaid = (await (await post(`/payments/orders/${placed.orderId}/verify`, {}, buyer.cookie)).json()) as { paymentStatus: string };
    expect(unpaid.paymentStatus).toBe("unpaid");

    stub.paystackVerify = { status: "success", amount: 90000, currency: "GHS" };
    const paid = (await (await post(`/payments/orders/${placed.orderId}/verify`, {}, buyer.cookie)).json()) as { paymentStatus: string };
    expect(paid.paymentStatus).toBe("paid");
    const stranger = await account();
    expect((await post(`/payments/orders/${placed.orderId}/verify`, {}, stranger.cookie)).status).toBe(404);
  });

  it("does not mark an order paid when the provider reports a different amount", async () => {
    const { response, buyer } = await checkout("GH", "paystack");
    const placed = (await response.json()) as { orderId: string };
    stub.paystackVerify = { status: "success", amount: 100, currency: "GHS" };
    const result = (await (await post(`/payments/orders/${placed.orderId}/verify`, {}, buyer.cookie)).json()) as {
      paymentStatus: string;
      attemptStatus: string;
    };
    expect(result).toMatchObject({ paymentStatus: "unpaid", attemptStatus: "failed" });
  });

  it("accepts only correctly signed Paystack webhooks, once", async () => {
    const { response } = await checkout("GH", "paystack");
    const placed = (await response.json()) as { orderId: string };
    const reference = String(stub.paystackInit[0].reference);
    const body = JSON.stringify({ event: "charge.success", data: { id: 7, reference, status: "success", amount: 90000, currency: "GHS" } });
    const { createHmac } = await import("node:crypto");
    const sign = (key: string) => createHmac("sha512", key).update(body).digest("hex");
    expect((await rawPost("/payments/webhooks/paystack", body, { "x-paystack-signature": sign("wrong") })).status).toBe(401);
    expect(await paidStatus(placed.orderId)).toBe("unpaid");
    // No browser headers are needed: this is a server-to-server call.
    expect((await rawPost("/payments/webhooks/paystack", body, { "x-paystack-signature": sign("sk_test_paystack") })).status).toBe(200);
    expect(await paidStatus(placed.orderId)).toBe("paid");
    expect((await rawPost("/payments/webhooks/paystack", body, { "x-paystack-signature": sign("sk_test_paystack") })).status).toBe(200);
    const { rows } = await database.query<{ n: number }>("SELECT count(*)::int n FROM payment_events");
    expect(rows[0].n).toBe(1);
  });

  it("charges international orders in GBP through Stripe and trusts only signed, fresh webhooks", async () => {
    const { response } = await checkout("GB", "stripe");
    const placed = (await response.json()) as { orderId: string; checkoutUrl: string };
    expect(placed.checkoutUrl).toBe("https://stripe.test/cs_test_1");
    expect(stub.stripeSessions[0]).toMatchObject({
      mode: "payment",
      "line_items[0][price_data][currency]": "gbp",
      "line_items[0][price_data][unit_amount]": "6000",
      client_reference_id: placed.orderId,
    });
    const body = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_1", payment_status: "paid", amount_total: 6000, currency: "gbp" } },
    });
    const { createHmac } = await import("node:crypto");
    const header = (t: number) => `t=${t},v1=${createHmac("sha256", "whsec_test").update(`${t}.${body}`).digest("hex")}`;
    const now = Math.floor(Date.now() / 1000);
    expect((await rawPost("/payments/webhooks/stripe", body, { "stripe-signature": header(now - 3600) })).status).toBe(401);
    expect(await paidStatus(placed.orderId)).toBe("unpaid");
    expect((await rawPost("/payments/webhooks/stripe", body, { "stripe-signature": header(now) })).status).toBe(200);
    expect(await paidStatus(placed.orderId)).toBe("paid");
  });

  it("keeps the order when the provider is down and lets the buyer retry payment", async () => {
    stub.down = true;
    const { response, buyer } = await checkout("GB", "stripe");
    expect(response.status).toBe(201);
    const placed = (await response.json()) as { orderId: string; checkoutUrl: string | null; paymentError: string };
    expect(placed.checkoutUrl).toBeNull();
    expect(placed.paymentError).toContain("payment provider");
    stub.down = false;
    const retry = await post(`/payments/orders/${placed.orderId}/start`, {}, buyer.cookie);
    expect(retry.status).toBe(200);
    expect(((await retry.json()) as { checkoutUrl: string }).checkoutUrl).toMatch(/^https:\/\/stripe\.test\//);
  });

  it("releases stock from online orders left unpaid past the payment window", async () => {
    const { response, buyer, productId } = await checkout("GB", "stripe");
    const placed = (await response.json()) as { orderId: string };
    const stock = async () =>
      (await database.query<{ stock_count: number }>("SELECT stock_count FROM products WHERE id = $1", [productId])).rows[0].stock_count;
    expect(await stock()).toBe(2);
    const { releaseAbandonedOrders } = await import("./lib/payments");
    expect(await releaseAbandonedOrders()).toBe(0);
    await database.query("UPDATE orders SET created_at = now() - interval '2 hours' WHERE id = $1", [placed.orderId]);
    expect(await releaseAbandonedOrders()).toBe(1);
    expect(await stock()).toBe(5);
    const retry = await post(`/payments/orders/${placed.orderId}/start`, {}, buyer.cookie);
    expect(retry.status).toBe(409);
  });
});
