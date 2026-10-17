import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { createECDH, randomBytes } from "node:crypto";
import webpush from "web-push";

// What the push service and email service received.
const received = vi.hoisted(() => ({
  push: [] as string[],
  email: [] as { to: string[]; subject: string; text: string }[],
  pushStatus: 201,
}));
// Push services only accept HTTPS, so the last hop is stood in for here: the
// real library still encrypts the message for the device and signs it.
vi.mock("web-push", async (original) => {
  const actual = ((await original()) as { default: typeof import("web-push") }).default;
  return {
    default: {
      ...actual,
      sendNotification: async (...args: Parameters<typeof actual.sendNotification>) => {
        actual.generateRequestDetails(...(args as Parameters<typeof actual.generateRequestDetails>));
        if (received.pushStatus >= 400)
          throw Object.assign(new Error("Push service refused"), { statusCode: received.pushStatus });
        received.push.push(args[0].endpoint.split("/push/")[1]);
        return { statusCode: received.pushStatus, body: "", headers: {} };
      },
    },
  };
});

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

let server: Server;
let stub: Server;
let base: string;
let stubUrl: string;
let database: import("@electric-sql/pglite").PGlite;
const headers = { "X-Fotizo-Request": "1", Origin: "http://localhost:5173" };

let count = 0;
async function account(role = "buyer") {
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name: `User ${++count}`, email: `n${count}@example.com`, password: "valid-password", role: "buyer", acceptedTerms: true }),
  });
  const { id } = (await response.json()) as { id: string };
  if (role !== "buyer") await database.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  return { id, email: `n${count}@example.com`, cookie: response.headers.get("set-cookie")!.split(";")[0] };
}
/** A browser subscription with real device keys. */
async function subscribe(userId: string, path: string) {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  await database.query("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)", [
    userId,
    `${stubUrl}/push/${path}`,
    ecdh.getPublicKey().toString("base64url"),
    randomBytes(16).toString("base64url"),
  ]);
}
/** An order line placed `daysAgo` days ago. */
async function orderLine(buyerId: string, sellerId: string, channel: "marketplace" | "shop", daysAgo: number) {
  const { rows: [product] } = await database.query<{ id: string }>(
    "INSERT INTO products (title, description, price, seller_id, category, channel, stock_count) VALUES ('Desk lamp', 'A lamp for the desk, with a warm bulb.', 20, $1, 'Lighting', $2, 5) RETURNING id",
    [sellerId, channel],
  );
  const { rows: [order] } = await database.query<{ id: string }>(
    "INSERT INTO orders (buyer_id, total, reference, created_at) VALUES ($1, 20, $3, now() - make_interval(days => $2)) RETURNING id",
    [buyerId, daysAgo, `FTZ-TEST-${++count}`],
  );
  const { rows: [line] } = await database.query<{ id: string }>(
    "INSERT INTO order_items (order_id, product_id, product_title, product_image, seller_id, seller, price, quantity) VALUES ($1, $2, 'Desk lamp', '', $3, 'Seller', 20, 1) RETURNING id",
    [order.id, product.id, sellerId],
  );
  return line.id;
}
const urgent = (line: string, cookie: string) =>
  fetch(`${base}/api/orders/lines/${line}/urgent`, { method: "POST", headers: { ...headers, Cookie: cookie } });

beforeAll(async () => {
  database = ((await import("@workspace/db")) as unknown as { testDatabase: typeof database }).testDatabase;
  await createTestSchema(database);
  stub = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      received.email.push(JSON.parse(Buffer.concat(chunks).toString()));
      res.writeHead(200, { "Content-Type": "application/json" }).end('{"id":"email"}');
    });
  });
  await new Promise<void>((resolve) => stub.listen(0, "127.0.0.1", resolve));
  stubUrl = `http://127.0.0.1:${(stub.address() as { port: number }).port}`;
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  for (const key of ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "RESEND_API_KEY", "EMAIL_FROM", "EMAIL_API_URL"]) delete process.env[key];
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await new Promise<void>((resolve) => stub.close(() => resolve()));
  await database.close();
});
beforeEach(async () => {
  await database.exec("TRUNCATE users, sessions, auth_rate_limits, products, orders, order_items, push_subscriptions, urgent_alerts CASCADE");
  const vapid = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
  process.env.RESEND_API_KEY = "email-test";
  process.env.EMAIL_FROM = "Fotizo <alerts@example.com>";
  process.env.EMAIL_API_URL = `${stubUrl}/emails`;
  received.push = [];
  received.email = [];
  received.pushStatus = 201;
});

describe("urgent alerts", () => {
  it("lets a buyer alert the seller once a day after the delivery date, by push and email", async () => {
    const buyer = await account();
    const seller = await account("seller");
    await subscribe(seller.id, "seller-phone");
    const early = await orderLine(buyer.id, seller.id, "marketplace", 3);
    const late = await orderLine(buyer.id, seller.id, "marketplace", 8);

    // Not before the delivery date (7 days after the order).
    const tooEarly = await urgent(early, buyer.cookie);
    expect(tooEarly.status).toBe(409);
    expect(((await tooEarly.json()) as { error: string }).error).toMatch(/due by/);

    const sent = await urgent(late, buyer.cookie);
    expect(sent.status).toBe(201);
    expect(await sent.json()).toMatchObject({ delivered: true });
    expect(received.push).toEqual(["seller-phone"]);
    expect(received.email).toEqual([expect.objectContaining({ to: [seller.email], subject: expect.stringMatching(/Urgent/) })]);
    expect(received.email[0].text).toMatch(/FTZ-TEST-[0-9]+: Desk lamp/);

    // Pressing again the same day is refused and says when it's allowed.
    const again = await urgent(late, buyer.cookie);
    expect(again.status).toBe(429);
    expect(again.headers.get("retry-after")).toBeTruthy();
    expect(await again.json()).toMatchObject({ urgentAvailableAt: expect.any(String) });
    expect(received.push).toHaveLength(1);

    // A day later it works again.
    await database.query("UPDATE urgent_alerts SET created_at = now() - interval '25 hours'");
    expect((await urgent(late, buyer.cookie)).status).toBe(201);
    expect(received.push).toHaveLength(2);
    const { rows } = await database.query<{ push_sent: number; email_sent: number }>("SELECT push_sent, email_sent FROM urgent_alerts ORDER BY created_at");
    expect(rows).toEqual([{ push_sent: 1, email_sent: 1 }, { push_sent: 1, email_sent: 1 }]);
  });

  it("refuses other buyers' orders and closed orders", async () => {
    const buyer = await account();
    const other = await account();
    const seller = await account("seller");
    const line = await orderLine(buyer.id, seller.id, "marketplace", 10);
    expect((await urgent(line, other.cookie)).status).toBe(404);
    await database.query("UPDATE order_items SET status = 'delivered' WHERE id = $1", [line]);
    expect((await urgent(line, buyer.cookie)).status).toBe(409);
    expect(received.email).toEqual([]);
  });

  it("alerts the China desk and managers for Fotizo Shop orders", async () => {
    const buyer = await account();
    const desk = await account("china_representative");
    const manager = await account("manager");
    const suspended = await account("manager");
    await database.query("UPDATE users SET suspended_at = now() WHERE id = $1", [suspended.id]);
    const line = await orderLine(buyer.id, desk.id, "shop", 8);
    expect((await urgent(line, buyer.cookie)).status).toBe(201);
    expect(received.email.map((e) => e.to[0]).sort()).toEqual([desk.email, manager.email].sort());
    expect(received.email.find((e) => e.to[0] === manager.email)!.text).toMatch(/dashboard\/manager\?tab=orders/);
  });

  it("dates shop lines from an accepted quote's delivery estimate", async () => {
    const buyer = await account();
    const desk = await account("china_representative");
    const line = await orderLine(buyer.id, desk.id, "shop", 20);
    await database.query(
      "UPDATE order_items SET needs_confirmation = true WHERE id = $1; ",
      [line],
    );
    await database.query(
      "UPDATE orders SET accepted_at = now() - interval '5 days', delivery_days_max = 14 WHERE id = (SELECT order_id FROM order_items WHERE id = $1)",
      [line],
    );
    expect((await urgent(line, buyer.cookie)).status).toBe(409);
    const orders = (await (await fetch(`${base}/api/orders`, { headers: { Cookie: buyer.cookie } })).json()) as {
      id: string;
      deliveryDue: string;
      urgentAvailableAt: string | null;
    }[];
    const shown = orders.find((o) => o.id === line)!;
    const days = (new Date(shown.deliveryDue).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(8.9);
    expect(days).toBeLessThan(9.1);
    expect(shown.urgentAvailableAt).toBe(shown.deliveryDue);
  });

  it("still records the alert, and forgets expired devices, when push fails", async () => {
    const buyer = await account();
    const seller = await account("seller");
    await subscribe(seller.id, "old-phone");
    received.pushStatus = 410;
    const line = await orderLine(buyer.id, seller.id, "marketplace", 9);
    expect((await urgent(line, buyer.cookie)).status).toBe(201);
    expect((await database.query("SELECT 1 FROM push_subscriptions")).rows).toHaveLength(0);
    expect(received.email).toHaveLength(1);
  });

  it("works without push or email set up, reporting that nobody was reached", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.RESEND_API_KEY;
    const buyer = await account();
    const seller = await account("seller");
    const line = await orderLine(buyer.id, seller.id, "marketplace", 9);
    const sent = await urgent(line, buyer.cookie);
    expect(sent.status).toBe(201);
    expect(await sent.json()).toMatchObject({ delivered: false });
  });
});

describe("push subscriptions", () => {
  it("shares the public key, saves a browser's subscription for its user and removes it", async () => {
    expect(await (await fetch(`${base}/api/push/key`)).json()).toEqual({ publicKey: process.env.VAPID_PUBLIC_KEY });
    const user = await account("seller");
    const other = await account("seller");
    const body = { endpoint: "https://push.example.com/abc", keys: { p256dh: "key", auth: "secret" } };
    const save = (cookie: string, data: unknown = body) =>
      fetch(`${base}/api/push/subscriptions`, { method: "POST", headers: { ...headers, Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(data) });
    expect((await save(user.cookie)).status).toBe(204);
    expect((await save(user.cookie, { endpoint: "http://insecure.example.com", keys: body.keys })).status).toBe(400);
    // The same browser signed in as someone else moves to them.
    expect((await save(other.cookie)).status).toBe(204);
    const owners = await database.query<{ user_id: string }>("SELECT user_id FROM push_subscriptions");
    expect(owners.rows).toEqual([{ user_id: other.id }]);
    const remove = await fetch(`${base}/api/push/subscriptions`, {
      method: "DELETE",
      headers: { ...headers, Cookie: other.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: body.endpoint }),
    });
    expect(remove.status).toBe(204);
    expect((await database.query("SELECT 1 FROM push_subscriptions")).rows).toHaveLength(0);
  });
});
