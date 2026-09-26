import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import type { Server } from "node:http";

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
let base: string;
let database: import("@electric-sql/pglite").PGlite;
const headers = { "Content-Type": "application/json", "X-Fotizo-Request": "1", Origin: "http://localhost:5173" };
const send = (method: string, path: string, data: unknown, cookie?: string) =>
  fetch(`${base}/api${path}`, {
    method,
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(data),
  });
const post = (path: string, data: unknown, cookie?: string) => send("POST", path, data, cookie);
const get = (path: string, cookie?: string) => fetch(`${base}/api${path}`, { headers: cookie ? { Cookie: cookie } : {} });
const json = async <T = Record<string, unknown>>(response: Response) => (await response.json()) as T;

let count = 0;
async function account(role = "buyer", name = `User ${count + 1}`) {
  const email = `user${++count}@example.com`;
  const response = await post("/auth/register", { name, email, password: "valid-password", role: "buyer", acceptedTerms: true });
  expect(response.status).toBe(201);
  const { id } = await json<{ id: string }>(response);
  if (role !== "buyer") await database.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  return { id, email, name, cookie: response.headers.get("set-cookie")!.split(";")[0] };
}
const audit = async () =>
  (await database.query<{ action: string; actor_name: string; reason: string }>("SELECT action, actor_name, reason FROM admin_audit ORDER BY created_at")).rows;

const product = {
  title: "Cordless drill set",
  category: "Tools",
  description: "18V cordless drill with two batteries, charger and a carrying case.",
  price: 120,
  originalPrice: null,
  stockCount: 5,
};
const service = {
  title: "Website build",
  category: "web-development",
  description: "A responsive five-page website with a contact form and basic SEO setup.",
  experience: "3–5 years",
  hourlyRate: 35,
  availability: "Weekdays",
  skills: ["React"],
  avatar: "data:image/png;base64,iVBORw0KGgo=",
  packages: [{ name: "Basic", price: 300, delivery: "7 days", description: "Five pages" }],
};

beforeAll(async () => {
  database = ((await import("@workspace/db")) as unknown as { testDatabase: typeof database }).testDatabase;
  await createTestSchema(database);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await database.close();
});
beforeEach(async () => {
  await database.exec("TRUNCATE users, sessions, auth_rate_limits, orders, order_items, products, services CASCADE");
});

describe("manager workspace access and accounts", () => {
  it("is limited to active managers", async () => {
    expect((await get("/admin/overview")).status).toBe(401);
    const seller = await account("seller");
    expect((await get("/admin/overview", seller.cookie)).status).toBe(403);
    const manager = await account("manager");
    const overview = await json(await get("/admin/overview", manager.cookie));
    expect(overview).toMatchObject({ totalUsers: 2, newUsersThisMonth: 2, unverifiedUsers: 2, ordersThisMonth: 0 });
  });

  it("searches and filters accounts with 1-based pages", async () => {
    const manager = await account("manager", "Maya Manager");
    await account("seller", "Ama 100%_ Mensah");
    await account("buyer", "Kwame Asante");
    await database.query("UPDATE users SET verified = true WHERE name = 'Kwame Asante'");
    const bySearch = await json<{ items: { name: string }[]; total: number; page: number }>(
      await get(`/admin/users?page=1&search=${encodeURIComponent("100%_")}`, manager.cookie),
    );
    expect(bySearch).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(bySearch.items[0].name).toBe("Ama 100%_ Mensah");
    const verified = await json<{ items: { name: string; status: string }[] }>(
      await get("/admin/users?page=1&verification=verified", manager.cookie),
    );
    expect(verified.items.map((u) => u.name)).toEqual(["Kwame Asante"]);
    const sellers = await json<{ total: number }>(await get("/admin/users?page=1&role=seller", manager.cookie));
    expect(sellers.total).toBe(1);
    expect((await get("/admin/users?page=0", manager.cookie)).status).toBe(400);
  });

  it("suspends and reinstates with version checks, session revocation and an audit record", async () => {
    const manager = await account("manager", "Maya Manager");
    const seller = await account("seller", "Ama Mensah");
    const change = (value: string, expected: string, reason = "Repeated policy violations") =>
      post(`/admin/users/${seller.id}/account`, { id: seller.id, action: "status", value, expected, reason }, manager.cookie);
    expect((await change("suspended", "active", "no")).status).toBe(400);
    expect((await change("suspended", "suspended")).status).toBe(409);
    const suspended = await change("suspended", "active");
    expect(suspended.status).toBe(200);
    expect(await json(suspended)).toMatchObject({ user: { status: "suspended" } });
    expect((await get("/auth/me", seller.cookie)).status).toBe(401);
    expect((await change("active", "suspended", "Appeal accepted after review")).status).toBe(200);
    expect(await audit()).toEqual([
      expect.objectContaining({ action: "user.suspend", actor_name: "Maya Manager" }),
      expect.objectContaining({ action: "user.reinstate", reason: "Appeal accepted after review" }),
    ]);
    const details = await json<{ activity: { action: string }[] }>(await get(`/admin/users/${seller.id}`, manager.cookie));
    expect(details.activity.map((a) => a.action)).toEqual(["user.reinstate", "user.suspend"]);
    // History cannot be rewritten.
    await expect(database.query("UPDATE admin_audit SET reason = 'changed later'")).rejects.toThrow(/append-only/);
  });

  it("changes roles immediately, never for the acting manager, and keeps a manager in charge", async () => {
    const first = await account("manager", "First Manager");
    const second = await account("manager", "Second Manager");
    const role = (actor: typeof first, target: typeof first, value: string, expected = "manager") =>
      post(`/admin/users/${target.id}/account`, { action: "role", value, expected, reason: "Team change agreed" }, actor.cookie);
    expect((await role(first, first, "buyer")).status).toBe(403);
    // Two managers demoting each other at once: exactly one wins.
    const results = await Promise.all([role(first, second, "buyer"), role(second, first, "buyer")]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 403]);
    const { rows } = await database.query<{ n: number }>("SELECT count(*)::int n FROM users WHERE role = 'manager'");
    expect(rows[0].n).toBe(1);
    const demoted = results[0].status === 200 ? second : first;
    expect((await get("/admin/overview", demoted.cookie)).status).toBe(403);
  });
});

describe("publication controls and listing approvals", () => {
  it("verifies accounts and holds listings that owners cannot republish", async () => {
    const manager = await account("manager");
    const seller = await account("seller", "Ama Mensah");
    const created = await json<{ id: string }>(await post("/products", product, seller.cookie));
    const decide = (body: Record<string, unknown>, target = created.id) =>
      post(`/admin/decisions/${target}`, { id: target, reason: "Checked against listing policy", ...body }, manager.cookie);
    expect((await decide({ kind: "user", verified: true, expected: false }, seller.id)).status).toBe(200);
    expect((await decide({ kind: "user", verified: true, expected: false }, seller.id)).status).toBe(409);
    expect((await decide({ kind: "product", status: "unpublished", expected: "active" })).status).toBe(200);
    const listings = await json<{ items: { id: string; status: string; hold: boolean }[] }>(
      await get("/admin/listings?page=1&kind=product&status=unpublished", manager.cookie),
    );
    expect(listings.items).toEqual([expect.objectContaining({ id: created.id, status: "unpublished", hold: true })]);
    const republish = await send("PATCH", `/products/${created.id}`, { status: "active" }, seller.cookie);
    expect(republish.status).toBe(409);
    expect((await decide({ kind: "product", status: "active", expected: "unpublished" })).status).toBe(200);
    expect((await send("PATCH", `/products/${created.id}`, { status: "unpublished" }, seller.cookie)).status).toBe(200);
    expect((await send("PATCH", `/products/${created.id}`, { status: "active" }, seller.cookie)).status).toBe(200);
    expect((await audit()).map((a) => a.action)).toEqual(["user.verify", "product.unpublish", "product.publish"]);
  });

  it("queues seller listings, versions resubmissions and returns rejection reasons", async () => {
    const manager = await account("manager", "Maya Manager");
    const seller = await account("seller", "Ama Mensah");
    const rep = await account("china_representative");
    await post("/products", { ...product, title: "Fotizo shop kettle" }, rep.cookie);
    const created = await json<{ id: string }>(await post("/products", product, seller.cookie));
    expect((await post("/services", service, seller.cookie)).status).toBe(201);
    type Queue = {
      items: { id: string; title: string; kind: string; version: number; status: string; history: { action: string }[] }[];
      total: number;
      counts: Record<string, number>;
    };
    const queue = async (query: string) => json<Queue>(await get(`/admin/approvals?page=1&${query}`, manager.cookie));
    const pending = await queue("status=pending");
    // Fotizo's own shop stock is not queued.
    expect(pending.counts).toEqual({ pending: 2, approved: 0, rejected: 0 });
    expect((await queue("status=pending&kind=service")).counts.pending).toBe(1);
    expect((await queue("status=pending&search=drill")).total).toBe(1);
    const review = pending.items.find((i) => i.kind === "product")!;
    expect(review).toMatchObject({ title: "Cordless drill set", version: 1, status: "pending" });

    // Stock changes don't need review; content changes do.
    await send("PATCH", `/products/${created.id}`, { stockCount: 9 }, seller.cookie);
    await send("PATCH", `/products/${created.id}`, { price: 110 }, seller.cookie);
    const decision = (expectedVersion: number, outcome: string, reason = "Photos must show the actual item") =>
      post(`/admin/approvals/${review.id}/decision`, { id: review.id, expectedVersion, outcome, reason }, manager.cookie);
    expect((await decision(1, "rejected")).status).toBe(409);
    expect((await decision(2, "rejected")).status).toBe(200);
    expect((await decision(2, "approved")).status).toBe(409);

    const mine = await json<{ id: string; status: string; moderation: Record<string, unknown> }[]>(
      await get("/seller/products", seller.cookie),
    );
    expect(mine[0]).toMatchObject({
      status: "unpublished",
      moderation: { review: "rejected", reason: "Photos must show the actual item", held: true },
    });
    expect((await send("PATCH", `/products/${created.id}`, { status: "active" }, seller.cookie)).status).toBe(409);

    await send("PATCH", `/products/${created.id}`, { description: `${product.description} Real photos added.` }, seller.cookie);
    const resubmitted = (await queue("status=pending&kind=product")).items[0];
    expect(resubmitted).toMatchObject({ id: review.id, version: 3 });
    expect(resubmitted.history.map((h) => h.action)).toEqual(["resubmitted", "rejected", "resubmitted", "submitted"]);
    expect((await decision(3, "approved", "Revised listing details reviewed")).status).toBe(200);
    // Approval lifts the hold; publishing stays the seller's choice.
    expect((await send("PATCH", `/products/${created.id}`, { status: "active" }, seller.cookie)).status).toBe(200);
    expect((await audit()).map((a) => a.action)).toEqual(["submission.rejected", "submission.approved"]);
  });
});

describe("order oversight and disputes", () => {
  async function placeOrder() {
    const seller = await account("seller", "Ama Mensah");
    const buyer = await account("buyer", "Kwame Asante");
    const created = await json<{ id: string }>(await post("/products", product, seller.cookie));
    const placed = await post(
      "/orders",
      {
        items: [{ productId: created.id, quantity: 1 }],
        delivery: {
          name: "Kwame", email: "kwame@example.com", phone: "0244000000", addressLine1: "1 Road",
          addressLine2: "", city: "Accra", postalCode: "", country: "GH",
        },
        paymentMethod: "pay_on_delivery",
        idempotencyKey: crypto.randomUUID(),
      },
      buyer.cookie,
    );
    expect(placed.status).toBe(201);
    return { seller, buyer, orderId: (await json<{ orderId: string }>(placed)).orderId };
  }

  it("shows orders with their state rolled up from the lines", async () => {
    const manager = await account("manager");
    const { seller, buyer, orderId } = await placeOrder();
    type Orders = { items: { id: string; status: string; buyer: { email: string }; items: unknown[]; delivery: { destination: string } }[]; total: number };
    const all = await json<Orders>(await get(`/admin/orders?page=1&search=${buyer.email}`, manager.cookie));
    expect(all.items[0]).toMatchObject({ id: orderId, status: "pending", delivery: { destination: "Accra, GH" } });
    const [line] = await json<{ id: string }[]>(await get("/sales", seller.cookie));
    await post(`/sales/${line.id}/status`, { status: "processing" }, seller.cookie);
    expect((await json<Orders>(await get("/admin/orders?page=1&status=pending", manager.cookie))).total).toBe(0);
    expect((await json<Orders>(await get("/admin/orders?page=1&status=processing", manager.cookie))).total).toBe(1);
    const detail = await json<{ order: { id: string }; disputes: unknown[] }>(await get(`/admin/orders/${orderId}`, manager.cookie));
    expect(detail).toMatchObject({ order: { id: orderId }, disputes: [] });
    expect((await get(`/admin/orders/${crypto.randomUUID()}`, manager.cookie)).status).toBe(404);
  });

  it("lets buyers open one dispute per order and managers move it through review", async () => {
    const manager = await account("manager", "Maya Manager");
    const { buyer, orderId } = await placeOrder();
    const stranger = await account();
    const report = { category: "damaged", summary: "The drill arrived with a cracked battery housing." };
    expect((await post(`/orders/${orderId}/disputes`, report, stranger.cookie)).status).toBe(404);
    expect((await post(`/orders/${orderId}/disputes`, { ...report, summary: "short" }, buyer.cookie)).status).toBe(400);
    const opened = await post(`/orders/${orderId}/disputes`, report, buyer.cookie);
    expect(opened.status).toBe(201);
    expect(await json(opened)).toMatchObject({ status: "open", categoryLabel: "Damaged item" });
    expect((await post(`/orders/${orderId}/disputes`, report, buyer.cookie)).status).toBe(409);

    type Disputes = {
      items: { id: string; status: string; priority: string; version: number; evidence: unknown[]; order: { id: string } }[];
    };
    const [dispute] = (await json<Disputes>(await get("/admin/disputes?page=1&search=Kwame", manager.cookie))).items;
    expect(dispute).toMatchObject({ status: "open", priority: "high", version: 1, order: { id: orderId } });
    expect(dispute.evidence).toHaveLength(1);
    const act = (action: string, expectedVersion: number) =>
      post(`/admin/disputes/${dispute.id}/decisions`, { id: dispute.id, action, expectedVersion, reason: "Photos reviewed with seller" }, manager.cookie);
    expect((await act("start_review", 1)).status).toBe(200);
    expect((await act("start_review", 1)).status).toBe(409);
    expect((await act("reopen", 2)).status).toBe(409);
    expect((await act("escalate_refund", 2)).status).toBe(200);
    // Refund review never changes the payment record.
    const { rows } = await database.query<{ payment_status: string }>("SELECT payment_status FROM orders WHERE id = $1", [orderId]);
    expect(rows[0].payment_status).toBe("unpaid");
    expect((await act("resolve", 3)).status).toBe(200);
    expect((await json<Disputes>(await get("/admin/disputes?page=1&status=resolved", manager.cookie))).items).toHaveLength(1);
    const buyerView = await json<{ status: string }[]>(await get(`/orders/${orderId}/disputes`, buyer.cookie));
    expect(buyerView[0].status).toBe("resolved");
    // Once resolved, a new problem can be reported.
    expect((await post(`/orders/${orderId}/disputes`, report, buyer.cookie)).status).toBe(201);
    expect((await act("reopen", 4)).status).toBe(409);
    expect((await audit()).map((a) => a.action)).toEqual(["dispute.start_review", "dispute.escalate_refund", "dispute.resolve"]);
    const trail = await json<{ items: { action: string }[]; total: number }>(await get("/admin/audit?page=1", manager.cookie));
    expect(trail.total).toBe(3);
    expect(trail.items[0].action).toBe("dispute.resolve");
  });
});

describe("public professional pages", () => {
  it("lists a provider's live services even before they write a profile, and hides withdrawn ones", async () => {
    const seller = await account("seller", "Ama Mensah");
    expect((await get(`/profiles/${seller.id}`)).status).toBe(404);
    const created = await json<{ id: string }>(await post("/services", service, seller.cookie));
    const page = await json<{ headline: string; services: { id: string }[]; email?: string }>(await get(`/profiles/${seller.id}`));
    expect(page).toMatchObject({ headline: "", services: [{ id: created.id }] });
    expect(page).not.toHaveProperty("email");
    await post(`/services/${created.id}/status`, { status: "unpublished" }, seller.cookie);
    expect((await get(`/profiles/${seller.id}`)).status).toBe(404);
  });
});
