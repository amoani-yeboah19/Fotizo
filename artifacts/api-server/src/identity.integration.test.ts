import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
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

// Seller identity verification through Veriff, against a fake Veriff API.
let server: Server;
let veriff: Server;
let base: string;
let database: import("@electric-sql/pglite").PGlite;
const SECRET = "veriff-test-shared-secret";
const KEY = "veriff-test-api-key";
const fake = {
  sessions: [] as Record<string, unknown>[],
  decisionRequests: [] as { path: string; signature: string | undefined }[],
  decision: null as null | Record<string, unknown>,
};
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
const hmac = (payload: string) => createHmac("sha256", SECRET).update(payload).digest("hex");

/** Delivers a webhook the way Veriff signs it. */
const webhook = (body: unknown, signature?: string) => {
  const raw = JSON.stringify(body);
  return fetch(`${base}/api/identity/webhooks/veriff`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-auth-client": KEY, "x-hmac-signature": signature ?? hmac(raw) },
    body: raw,
  });
};

let count = 0;
async function account(role = "seller", name = "Ama Mensah") {
  const email = `identity${++count}@example.com`;
  const response = await post("/auth/register", { name, email, password: "valid-password", role: "buyer", acceptedTerms: true });
  expect(response.status).toBe(201);
  const { id } = await json<{ id: string }>(response);
  if (role !== "buyer") await database.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  return { id, cookie: response.headers.get("set-cookie")!.split(";")[0] };
}
const product = { title: "Kente stole", category: "Fashion", description: "Handwoven kente stole from Bonwire.", price: 40, originalPrice: null, stockCount: 3 };

async function startSession(seller: { cookie: string }) {
  const response = await post("/identity/session", {}, seller.cookie);
  expect(response.status).toBe(201);
  const sent = fake.sessions.at(-1) as { verification: { vendorData: string } };
  return { url: (await json<{ url: string }>(response)).url, vendorData: sent.verification.vendorData, sessionId: `sess-${fake.sessions.length}` };
}

const decision = (sessionId: string, vendorData: string, status: string, extra: Record<string, unknown> = {}) => ({
  status: "success",
  verification: {
    id: sessionId,
    status,
    code: status === "approved" ? 9001 : 9102,
    reason: status === "approved" ? null : "Document is not readable",
    reasonCode: null,
    decisionTime: "2026-10-01T10:00:00.000Z",
    vendorData,
    person: { firstName: "AMA", lastName: "Mensah" },
    document: { type: "ID_CARD", country: "GH", number: "GHA-000000000-0" },
    ...extra,
  },
});

beforeAll(async () => {
  database = ((await import("@workspace/db")) as unknown as { testDatabase: typeof database }).testDatabase;
  await createTestSchema(database);
  veriff = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.method === "POST" && req.url === "/v1/sessions") {
        fake.sessions.push(JSON.parse(body));
        const n = fake.sessions.length;
        res.end(JSON.stringify({ status: "success", verification: { id: `sess-${n}`, url: `https://alchemy.veriff.com/v/token-${n}` } }));
        return;
      }
      fake.decisionRequests.push({ path: req.url ?? "", signature: req.headers["x-hmac-signature"] as string | undefined });
      res.end(JSON.stringify({ status: "success", verification: fake.decision }));
    });
  });
  await new Promise<void>((resolve) => veriff.listen(0, "127.0.0.1", resolve));
  const settings = {
    VERIFF_API_KEY: KEY,
    VERIFF_SHARED_SECRET: SECRET,
    VERIFF_API_URL: `http://127.0.0.1:${(veriff.address() as { port: number }).port}`,
    APP_URL: "http://localhost:5173",
    IDENTITY_REQUIRED_FROM: undefined,
  };
  for (const [key, value] of Object.entries(settings)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
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
  await new Promise<void>((resolve) => veriff.close(() => resolve()));
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await database.close();
});
beforeEach(async () => {
  fake.sessions = [];
  fake.decisionRequests = [];
  fake.decision = null;
  delete process.env.IDENTITY_REQUIRED_FROM;
  await database.exec("TRUNCATE users, sessions, auth_rate_limits, orders, order_items, products, services, identity_webhook_events CASCADE");
});

describe("seller identity verification", () => {
  it("starts a Veriff session for sellers with only opaque ids, and reuses an unfinished one", async () => {
    const buyer = await account("buyer");
    expect((await post("/identity/session", {}, buyer.cookie)).status).toBe(403);
    const seller = await account();
    expect(await json(await get("/identity", seller.cookie))).toMatchObject({ required: true, status: "none", available: true });
    const { url, vendorData } = await startSession(seller);
    expect(url).toBe("https://alchemy.veriff.com/v/token-1");
    // No name, email or document details leave Fotizo.
    expect(fake.sessions[0]).toEqual({
      verification: {
        callback: "http://localhost:5173/dashboard/seller?tab=verification",
        vendorData,
        endUserId: seller.id,
      },
    });
    const me = await json<{ identityStatus: string }>(await get("/auth/me", seller.cookie));
    expect(me.identityStatus).toBe("pending");
    // Opening it again reuses the session Veriff already billed.
    expect(await json(await post("/identity/session", {}, seller.cookie))).toEqual({ url });
    expect(fake.sessions).toHaveLength(1);
  });

  it("limits new sessions to three in 30 days", async () => {
    const seller = await account();
    for (let i = 0; i < 3; i++) {
      await startSession(seller);
      await database.query("UPDATE identity_verifications SET status = 'expired' WHERE user_id = $1", [seller.id]);
    }
    expect((await post("/identity/session", {}, seller.cookie)).status).toBe(429);
  });

  it("applies signed decisions once, ignoring stale or out-of-order deliveries", async () => {
    const seller = await account();
    const { sessionId, vendorData } = await startSession(seller);
    const approved = decision(sessionId, vendorData, "approved");
    expect((await webhook(approved, "0".repeat(64))).status).toBe(401);
    expect((await webhook({ id: sessionId, action: "submitted", vendorData })).status).toBe(200);
    expect((await webhook(approved)).status).toBe(200);
    expect((await webhook(approved)).status).toBe(200);
    expect(await json(await get("/identity", seller.cookie))).toMatchObject({ status: "approved", verifiedAt: "2026-10-01T10:00:00.000Z" });
    // A late "abandoned", or an older decision, never undoes the approval.
    await webhook(decision(sessionId, vendorData, "abandoned", { decisionTime: "2026-10-02T10:00:00.000Z" }));
    await webhook(decision(sessionId, vendorData, "declined", { decisionTime: "2026-09-30T10:00:00.000Z" }));
    expect(await json(await get("/identity", seller.cookie))).toMatchObject({ status: "approved" });
    // Only the decision is kept, never the document number.
    const { rows } = await database.query<Record<string, unknown>>("SELECT * FROM identity_verifications");
    expect(rows[0]).toMatchObject({ status: "approved", document_type: "ID_CARD", document_country: "GH", name_matches: true });
    expect(JSON.stringify(rows)).not.toContain("GHA-000000000-0");
    const events = await database.query("SELECT * FROM identity_webhook_events");
    expect(events.rows).toHaveLength(4);
  });

  it("sends name mismatches to managers and invites resubmission with Veriff's reason", async () => {
    const mismatch = await account("seller", "Kojo Asante");
    const first = await startSession(mismatch);
    await webhook(decision(first.sessionId, first.vendorData, "approved"));
    expect(await json(await get("/identity", mismatch.cookie))).toMatchObject({ status: "review" });
    expect((await post("/identity/session", {}, mismatch.cookie)).status).toBe(409);

    const retry = await account();
    const second = await startSession(retry);
    await webhook(decision(second.sessionId, second.vendorData, "resubmission_requested"));
    expect(await json(await get("/identity", retry.cookie))).toMatchObject({
      status: "resubmission_requested",
      session: { status: "resubmission_requested", reason: "Document is not readable" },
    });
    expect((await post("/identity/session", {}, retry.cookie)).status).toBe(201);
  });

  it("asks Veriff for the decision when the webhook is late, signing the session id", async () => {
    const seller = await account();
    const { sessionId, vendorData } = await startSession(seller);
    fake.decision = decision(sessionId, vendorData, "approved").verification;
    expect(await json(await post("/identity/refresh", {}, seller.cookie))).toMatchObject({ status: "approved" });
    expect(fake.decisionRequests[0]).toEqual({ path: `/v1/sessions/${sessionId}/decision`, signature: hmac(sessionId) });
  });

  it("hides unverified sellers' listings once required, after a grace period for existing sellers", async () => {
    const seller = await account();
    const created = await json<{ id: string }>(await post("/products", product, seller.cookie));
    const rep = await account("china_representative");
    const shop = await json<{ id: string }>(await post("/products", product, rep.cookie));
    const buyer = await account("buyer");
    // An existing seller: joined before verification became required.
    await database.query("UPDATE users SET created_at = now() - interval '30 days' WHERE id = $1", [seller.id]);
    const visible = async (id: string) => (await get(`/products/${id}`)).status === 200;
    // Not required yet: everything shows.
    expect(await visible(created.id)).toBe(true);
    // Required from yesterday: an existing seller keeps 14 days' grace.
    process.env.IDENTITY_REQUIRED_FROM = new Date(Date.now() - 86_400_000).toISOString();
    expect(await visible(created.id)).toBe(true);
    expect(await json(await get("/identity", seller.cookie))).toMatchObject({ listingsVisible: true });
    // Grace over: hidden from listings, product pages and checkout until verified.
    process.env.IDENTITY_REQUIRED_FROM = new Date(Date.now() - 20 * 86_400_000).toISOString();
    expect(await visible(created.id)).toBe(false);
    const list = await json<{ items: { id: string }[] }>(await get("/products?channel=marketplace"));
    expect(list.items).toEqual([]);
    const order = await post(
      "/orders",
      {
        items: [{ productId: created.id, quantity: 1 }],
        delivery: { name: "Kwame", email: "kwame@example.com", phone: "0244000000", addressLine1: "1 Road", addressLine2: "", city: "Accra", postalCode: "", country: "GH" },
        paymentMethod: "pay_on_delivery",
        idempotencyKey: crypto.randomUUID(),
      },
      buyer.cookie,
    );
    expect(order.status).toBe(409);
    // Fotizo's own staff listings are unaffected.
    expect(await visible(shop.id)).toBe(true);
    const { sessionId, vendorData } = await startSession(seller);
    await webhook(decision(sessionId, vendorData, "approved"));
    expect(await visible(created.id)).toBe(true);
  });

  it("lets managers decide identity cases with an audit record", async () => {
    const manager = await account("manager", "Efua Manager");
    const seller = await account("seller", "Kojo Asante");
    const { sessionId, vendorData } = await startSession(seller);
    await webhook(decision(sessionId, vendorData, "approved"));
    const decide = (expected: string) =>
      post(`/admin/decisions/${seller.id}`, { kind: "identity", status: "approved", expected, reason: "Name differs only by nickname; documents checked." }, manager.cookie);
    expect((await decide("pending")).status).toBe(409);
    expect((await decide("review")).status).toBe(200);
    expect(await json(await get("/identity", seller.cookie))).toMatchObject({ status: "approved" });
    const detail = await json<{ user: { identityStatus: string }; identityChecks: { sessionId: string; nameMatches: boolean }[]; activity: { action: string }[] }>(
      await get(`/admin/users/${seller.id}`, manager.cookie),
    );
    expect(detail.user.identityStatus).toBe("approved");
    expect(detail.identityChecks[0]).toMatchObject({ sessionId, nameMatches: false });
    expect(detail.activity[0].action).toBe("user.identity_approve");
    const filtered = await json<{ items: { id: string }[] }>(await get("/admin/users?identity=approved", manager.cookie));
    expect(filtered.items.map((u) => u.id)).toEqual([seller.id]);
  });

  it("shows the ID badge on public profiles only after verification, and hides unverified ones once required", async () => {
    const seller = await account();
    await database.query(
      "INSERT INTO account_profiles (user_id, country, language, headline) VALUES ($1, 'GH', 'en', 'Kente weaver')",
      [seller.id],
    );
    const profile = () => get(`/profiles/${seller.id}`);
    expect(await json(await profile())).toMatchObject({ identityVerified: false });
    process.env.IDENTITY_REQUIRED_FROM = new Date(Date.now() - 20 * 86_400_000).toISOString();
    expect((await profile()).status).toBe(404);
    await database.query("UPDATE users SET identity_status = 'approved', identity_verified_at = now() WHERE id = $1", [seller.id]);
    expect(await json(await profile())).toMatchObject({ identityVerified: true });
  });
});
