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
