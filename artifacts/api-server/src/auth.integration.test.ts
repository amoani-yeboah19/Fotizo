import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { z } from "zod";

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
import {
  ListManagedAccountsResponse,
  ListAccountAuditResponse,
  ListCatalogueProductsResponse,
  ListCatalogueCategoriesResponse,
} from "@workspace/api-zod";
import app from "./app";
import { createTestSchema } from "./test-schema";
import { runtimeState } from "./lib/readiness";
import {
  db,
  usersTable,
  sessionsTable,
  accountAuditTable,
  productsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { issueSession, resolveSession } from "./lib/sessions";
import {
  signAuthToken,
  signPendingGoogleSignupToken,
  verifyAuthToken,
  verifyPendingGoogleSignupToken,
} from "./lib/jwt";
import { changeAccountStatus } from "./lib/account-controls";
import { changeAccountPassword } from "./lib/account";
import type { Response } from "express";
import { consumeAuthAttempt } from "./middlewares/security";

let server: Server;
let base: string;
let database: import("@electric-sql/pglite").PGlite;
const account = {
  name: "Alice",
  email: "alice@example.com",
  password: "valid-password",
  role: "buyer",
  acceptedTerms: true,
};
const headers = {
  "Content-Type": "application/json",
  "X-Fotizo-Request": "1",
  Origin: "http://localhost:5173",
};
async function post(path: string, data = {}, cookie?: string) {
  return fetch(`${base}/api${path}`, {
    method: "POST",
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(data),
  });
}
async function register(data = account) {
  const response = await post("/auth/register", data);
  expect(response.status).toBe(201);
  return {
    user: z
      .object({ id: z.string().uuid() })
      .passthrough()
      .parse(await response.json()),
    cookie: response.headers.get("set-cookie")!.split(";")[0],
  };
}
beforeAll(async () => {
  database = (
    (await import("@workspace/db")) as unknown as {
      testDatabase: typeof database;
    }
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
  await database.exec("TRUNCATE users, sessions, auth_rate_limits CASCADE");
});

describe("authentication through the HTTP API and PostgreSQL", () => {
  it("persists an account, issues a session, excludes credentials and revokes copied cookies on logout", async () => {
    const { cookie, user } = await register();
    expect(user.passwordHash).toBeUndefined();
    expect(user.suspendedAt).toBeUndefined();
    const me = await fetch(`${base}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    expect(me.status).toBe(200);
    expect(me.headers.get("cache-control")).toBe("no-store");
    expect(await me.json()).toMatchObject({ id: user.id });
    expect((await post("/auth/logout", {}, cookie)).status).toBe(204);
    expect(
      (await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } }))
        .status,
    ).toBe(401);
    expect((await post("/auth/logout", {}, cookie)).status).toBe(204);
  });
  it("rejects an order without delivery details or a payment method", async () => {
    const { cookie } = await register();
    const response = await post(
      "/orders",
      { items: [{ productId: crypto.randomUUID(), quantity: 1 }] },
      cookie,
    );
    expect(response.status).toBe(400);
  });
  it("rejects public staff signup and wrong passwords", async () => {
    expect(
      (await post("/auth/register", { ...account, role: "manager" })).status,
    ).toBe(400);
    await register();
    expect(
      (await post("/auth/login", { email: account.email, password: "wrong" }))
        .status,
    ).toBe(401);
    expect((await post("/auth/login", account)).status).toBe(200);
  });
  it("enforces current roles, suspension and database expiry", async () => {
    const { cookie, user } = await register();
    const token = cookie.slice(cookie.indexOf("=") + 1);
    await db
      .update(usersTable)
      .set({ role: "seller" })
      .where(eq(usersTable.id, user.id));
    expect((await resolveSession(token))?.role).toBe("seller");
    await db
      .update(usersTable)
      .set({ suspendedAt: new Date() })
      .where(eq(usersTable.id, user.id));
    expect(await resolveSession(token)).toBeNull();
    expect((await post("/auth/login", account)).status).toBe(403);
    await db
      .update(usersTable)
      .set({ suspendedAt: null })
      .where(eq(usersTable.id, user.id));
    await db.update(sessionsTable).set({ expiresAt: new Date(0) });
    expect(await resolveSession(token)).toBeNull();
  });
  it("does not accept a valid token whose session belongs to a different user", async () => {
    const a = await register();
    const b = await register({ ...account, email: "bob@example.com" });
    const claims = verifyAuthToken(b.cookie.split("=")[1]);
    const mismatched = signAuthToken({
      sub: a.user.id,
      sid: claims.sid,
      role: "buyer",
    });
    expect(await resolveSession(mismatched)).toBeNull();
  });
  it("rejects cross-site forms and untrusted origins before authentication writes", async () => {
    for (const requestHeaders of [
      {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://attacker.example",
      },
      { ...headers, Origin: "https://attacker.example" },
      { "Content-Type": "application/json", Origin: "http://localhost:5173" },
    ]) {
      const response = await fetch(`${base}/api/auth/logout`, {
        method: "POST",
        headers: requestHeaders,
        body: "{}",
      });
      expect(response.status).toBe(403);
    }
    expect((await post("/auth/logout")).status).toBe(204);
  });
  it("returns JSON for malformed input and maps duplicate registration to a conflict", async () => {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers,
      body: "{",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Invalid JSON body.",
    });
    const results = await Promise.all([
      post("/auth/register", account),
      post("/auth/register", account),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });
  it("counts concurrent attempts atomically and expires the rate-limit window", async () => {
    const now = 1_800_000;
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        consumeAuthAttempt("same-client", 5, now),
      ),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    expect((await consumeAuthAttempt("another-client", 5, now)).allowed).toBe(
      true,
    );
    expect(
      (await consumeAuthAttempt("same-client", 5, now + 900_000)).allowed,
    ).toBe(true);
  });
  it("returns 429 and Retry-After from the real auth endpoint", async () => {
    for (let i = 0; i < 30; i++) await post("/auth/login", {});
    const response = await post("/auth/login", {});
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
    for (const alias of [
      "/auth/LOGIN",
      "/auth/login/",
      "/auth/Google/Complete/",
    ]) {
      expect((await post(alias, {})).status).toBe(429);
    }
  });
});

describe("JWT purpose and claim boundaries", () => {
  it("rejects pending signup tokens as sessions and sessions as signup tokens", () => {
    const pending = signPendingGoogleSignupToken({
      googleId: "google-1",
      email: "a@example.com",
      name: "Alice",
    });
    expect(() => verifyAuthToken(pending)).toThrow();
    expect(verifyPendingGoogleSignupToken(pending).googleId).toBe("google-1");
    const session = signAuthToken({
      sub: crypto.randomUUID(),
      sid: crypto.randomUUID(),
      role: "buyer",
    });
    expect(() => verifyPendingGoogleSignupToken(session)).toThrow();
    expect(verifyAuthToken(session).purpose).toBe("session");
  });
  it("rejects legacy, expired, missing-claim and wrong-audience tokens", () => {
    const claims = {
      sub: crypto.randomUUID(),
      sid: crypto.randomUUID(),
      role: "buyer",
      purpose: "session",
    };
    for (const token of [
      jwt.sign(claims, process.env.JWT_SECRET!),
      jwt.sign(claims, process.env.JWT_SECRET!, {
        expiresIn: -1,
        issuer: "fotizo-api",
        audience: "fotizo-web",
      }),
      jwt.sign({ purpose: "session" }, process.env.JWT_SECRET!, {
        expiresIn: 100,
        issuer: "fotizo-api",
        audience: "fotizo-web",
      }),
      jwt.sign(claims, process.env.JWT_SECRET!, {
        expiresIn: 100,
        issuer: "fotizo-api",
        audience: "someone-else",
      }),
    ])
      expect(() => verifyAuthToken(token)).toThrow();
  });
});

describe("catalogue ownership and publication", () => {
  const listing = {
    title: "Test listing",
    description: "A detailed description of this useful product.",
    category: "Electronics",
    price: 20.5,
    originalPrice: null,
    stockCount: 3,
    images: ["data:image/png;base64,iVBORw0KGgo="],
  };
  async function change(id: string, cookie: string, changes: unknown) {
    return fetch(`${base}/api/products/${id}`, {
      method: "PATCH",
      headers: { ...headers, Cookie: cookie },
      body: JSON.stringify(changes),
    });
  }
  it("keeps unpublished details private while allowing owner editing and republishing", async () => {
    const seller = await register({ ...account, role: "seller" });
    const other = await register({
      ...account,
      role: "seller",
      email: "other@example.com",
    });
    const created = await post("/products", listing, seller.cookie);
    expect(created.status).toBe(201);
    const product = z.object({ id: z.string() }).parse(await created.json());
    expect(
      (await change(product.id, seller.cookie, { status: "unpublished" }))
        .status,
    ).toBe(200);
    expect((await fetch(`${base}/api/products/${product.id}`)).status).toBe(
      404,
    );
    expect(
      (
        await fetch(`${base}/api/seller/products/${product.id}`, {
          headers: { Cookie: other.cookie },
        })
      ).status,
    ).toBe(403);
    const owned = await fetch(`${base}/api/seller/products/${product.id}`, {
      headers: { Cookie: seller.cookie },
    });
    expect(owned.status).toBe(200);
    expect(await owned.json()).toMatchObject({
      status: "unpublished",
      images: listing.images,
    });
    expect(
      (await change(product.id, other.cookie, { title: "Stolen listing" }))
        .status,
    ).toBe(403);
    expect(
      (await change(product.id, seller.cookie, { status: "active", price: 25 }))
        .status,
    ).toBe(200);
    expect(
      await (await fetch(`${base}/api/products/${product.id}`)).json(),
    ).toMatchObject({ price: 25, images: listing.images });
    await db
      .update(usersTable)
      .set({ role: "buyer" })
      .where(eq(usersTable.id, seller.user.id));
    expect(
      (await change(product.id, seller.cookie, { title: "Cannot edit now" }))
        .status,
    ).toBe(403);
  });
  it("derives shop classification from staff ownership and ignores client-spoofed channels", async () => {
    const seller = await register({ ...account, role: "seller" });
    const rep = await register({
      ...account,
      role: "seller",
      email: "rep@example.com",
    });
    await db
      .update(usersTable)
      .set({ role: "china_representative" })
      .where(eq(usersTable.id, rep.user.id));
    const local = await post(
      "/products",
      { ...listing, channel: "shop" },
      seller.cookie,
    );
    expect(await local.json()).toMatchObject({ channel: "marketplace" });
    const imported = await post("/products", listing, rep.cookie);
    expect(await imported.json()).toMatchObject({ channel: "shop" });
    const shop = await (
      await fetch(`${base}/api/products?channel=shop`)
    ).json();
    expect(shop).toMatchObject({
      items: [
        expect.objectContaining({ sellerId: rep.user.id, channel: "shop" }),
      ],
      total: 1,
    });
    expect((await fetch(`${base}/api/products?channel=invalid`)).status).toBe(
      400,
    );
  });
  it("validates prices, inventory range and empty updates before SQL", async () => {
    const seller = await register({ ...account, role: "seller" });
    for (const invalid of [
      { price: 0.001 },
      { price: 100_000_000 },
      { stockCount: 2_147_483_648 },
    ]) {
      expect(
        (await post("/products", { ...listing, ...invalid }, seller.cookie))
          .status,
      ).toBe(400);
    }
    const response = await post("/products", listing, seller.cookie);
    const { id } = z.object({ id: z.string() }).parse(await response.json());
    expect((await change(id, seller.cookie, {})).status).toBe(400);
  });
});

describe("account settings", () => {
  async function profile(data: unknown, cookie?: string) {
    return fetch(`${base}/api/auth/profile`, {
      method: "PATCH",
      headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(data),
    });
  }
  const passwords = {
    currentPassword: account.password,
    newPassword: "replacement-password",
  };
  it("persists only the authenticated user's display name and excludes credential material", async () => {
    const alice = await register();
    const bob = await register({ ...account, email: "bob@example.com" });
    expect((await profile({ name: "Intruder" })).status).toBe(401);
    const response = await profile({ name: "  Updated Alice  " }, alice.cookie);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      name: "Updated Alice",
      hasPassword: true,
      email: account.email,
      role: "buyer",
    });
    expect(body).not.toHaveProperty("passwordHash");
    expect(body).not.toHaveProperty("googleId");
    expect(
      await (
        await fetch(`${base}/api/auth/me`, {
          headers: { Cookie: alice.cookie },
        })
      ).json(),
    ).toMatchObject({ name: "Updated Alice" });
    expect(
      (
        await db.query.usersTable.findFirst({
          where: eq(usersTable.id, bob.user.id),
        })
      )?.name,
    ).toBe("Alice");
    for (const input of [
      { name: " " },
      { name: "x".repeat(121) },
      { name: "x", role: "manager" },
      { name: "x", email: "other@example.com" },
      { name: "x", id: bob.user.id },
      { name: "x", verified: true },
    ]) {
      expect((await profile(input, alice.cookie)).status).toBe(400);
    }
  });
  it("changes the password and revokes all sessions without affecting other accounts", async () => {
    const alice = await register();
    const login = await post("/auth/login", account);
    const secondCookie = login.headers.get("set-cookie")!.split(";")[0];
    const bob = await register({ ...account, email: "bob@example.com" });
    const response = await post("/auth/password", passwords, alice.cookie);
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
    for (const cookie of [alice.cookie, secondCookie])
      expect(
        (await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } }))
          .status,
      ).toBe(401);
    expect(
      (await fetch(`${base}/api/auth/me`, { headers: { Cookie: bob.cookie } }))
        .status,
    ).toBe(200);
    expect((await post("/auth/login", account)).status).toBe(401);
    expect(
      (
        await post("/auth/login", {
          ...account,
          password: passwords.newPassword,
        })
      ).status,
    ).toBe(200);
  });
  it("rejects wrong, reused, short and overlong UTF-8 passwords without revoking the session", async () => {
    const { cookie } = await register();
    for (const changes of [
      { currentPassword: "wrong" },
      { newPassword: account.password },
      { newPassword: "short" },
      { newPassword: "abcd".repeat(19) },
      { newPassword: "\u00e9".repeat(37) },
    ]) {
      expect(
        (await post("/auth/password", { ...passwords, ...changes }, cookie))
          .status,
      ).toBe(400);
    }
    expect(
      (await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } }))
        .status,
    ).toBe(200);
    expect((await post("/auth/login", account)).status).toBe(200);
  });
  it("rejects Google-only password changes and limits repeated attempts by account", async () => {
    const { user, cookie } = await register();
    await db
      .update(usersTable)
      .set({ passwordHash: null, googleId: "google-account" })
      .where(eq(usersTable.id, user.id));
    expect(
      await (
        await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } })
      ).json(),
    ).toMatchObject({ hasPassword: false });
    expect((await post("/auth/password", passwords, cookie)).status).toBe(409);
    for (let i = 0; i < 4; i++) await post("/auth/password", passwords, cookie);
    const limited = await post("/auth/PASSWORD/", passwords, cookie);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });
  it("requires a live session and permits only one of two concurrent password replacements", async () => {
    expect((await post("/auth/password", passwords)).status).toBe(401);
    const { cookie } = await register();
    const responses = await Promise.all([
      post("/auth/password", passwords, cookie),
      post(
        "/auth/password",
        { ...passwords, newPassword: "another-new-password" },
        cookie,
      ),
    ]);
    expect(responses.filter((r) => r.status === 204)).toHaveLength(1);
    expect(responses.some((r) => [401, 409].includes(r.status))).toBe(true);
    expect(await db.select().from(sessionsTable)).toHaveLength(0);
  });
  it("blocks stale credential session issuance after a password change", async () => {
    const { user, cookie } = await register();
    const snapshot = (await db.query.usersTable.findFirst({
      where: eq(usersTable.id, user.id),
    }))!;
    expect((await post("/auth/password", passwords, cookie)).status).toBe(204);
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      cookie: vi.fn(),
    };
    expect(await issueSession(response as unknown as Response, snapshot)).toBe(
      false,
    );
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.cookie).not.toHaveBeenCalled();
    expect(await db.select().from(sessionsTable)).toHaveLength(0);
  });
  it("rechecks session validity during the password transaction", async () => {
    const { user, cookie } = await register();
    const claims = verifyAuthToken(cookie.split("=")[1]);
    await post("/auth/logout", {}, cookie);
    expect(
      (
        await changeAccountPassword(
          user.id,
          claims.sid,
          passwords.currentPassword,
          passwords.newPassword,
        )
      ).status,
    ).toBe(401);
    expect((await post("/auth/login", account)).status).toBe(200);
  });
});

it("rolls back the password when session revocation fails", async () => {
  const { cookie } = await register();
  await database.exec(`CREATE FUNCTION fail_test_session_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test revocation failure'; END $$;
    CREATE TRIGGER fail_test_session_delete BEFORE DELETE ON sessions FOR EACH ROW EXECUTE FUNCTION fail_test_session_delete();`);
  try {
    const response = await post(
      "/auth/password",
      { currentPassword: account.password, newPassword: "must-not-be-saved" },
      cookie,
    );
    expect(response.status).toBe(503);
    expect((await post("/auth/login", account)).status).toBe(200);
    expect(
      (await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } }))
        .status,
    ).toBe(200);
  } finally {
    await database.exec(
      "DROP TRIGGER fail_test_session_delete ON sessions; DROP FUNCTION fail_test_session_delete();",
    );
  }
});

describe("readiness and liveness", () => {
  it("reports readiness with the migrated security/catalogue schema", async () => {
    const response = await fetch(`${base}/api/readyz`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ready" });
  });
  it("requires the account audit migration before reporting ready", async () => {
    await database.exec(
      "ALTER TABLE account_audit RENAME TO hidden_account_audit",
    );
    try {
      const response = await fetch(`${base}/api/readyz`);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ status: "not_ready" });
      expect((await fetch(`${base}/api/healthz`)).status).toBe(200);
    } finally {
      await database.exec(
        "ALTER TABLE hidden_account_audit RENAME TO account_audit",
      );
    }
    expect((await fetch(`${base}/api/readyz`)).status).toBe(200);
  });
  it("keeps liveness healthy while refusing readiness during shutdown", async () => {
    runtimeState.draining = true;
    try {
      expect((await fetch(`${base}/api/readyz`)).status).toBe(503);
      expect((await fetch(`${base}/api/healthz`)).status).toBe(200);
    } finally {
      runtimeState.draining = false;
    }
  });
  it("returns a generic readiness failure if the required migration is missing", async () => {
    await database.exec(
      "ALTER TABLE products RENAME COLUMN channel TO hidden_channel",
    );
    try {
      const response = await fetch(`${base}/api/readyz`);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ status: "not_ready" });
      expect((await fetch(`${base}/api/healthz`)).status).toBe(200);
    } finally {
      await database.exec(
        "ALTER TABLE products RENAME COLUMN hidden_channel TO channel",
      );
    }
    expect((await fetch(`${base}/api/readyz`)).status).toBe(200);
  });
});

describe("manager account controls", () => {
  async function manager() {
    const result = await register({ ...account, email: "manager@example.com" });
    await db
      .update(usersTable)
      .set({ role: "manager" })
      .where(eq(usersTable.id, result.user.id));
    return result;
  }
  function get(path: string, cookie?: string) {
    return fetch(`${base}/api/admin${path}`, {
      headers: cookie ? { Cookie: cookie } : {},
    });
  }
  function change(
    target: string,
    cookie: string,
    expectedVersion = 0,
    action = "suspend",
    reason = "Repeated policy violations confirmed.",
  ) {
    return post(
      `/admin/accounts/${target}/status`,
      { action, expectedVersion, reason },
      cookie,
    );
  }
  it("denies anonymous and every non-manager role access to account controls and audit records", async () => {
    expect((await get("/accounts")).status).toBe(401);
    const member = await register();
    for (const role of [
      "buyer",
      "seller",
      "developer",
      "representative",
      "china_representative",
    ] as const) {
      await db
        .update(usersTable)
        .set({ role })
        .where(eq(usersTable.id, member.user.id));
      for (const path of ["/accounts", "/accounts/summary", "/account-audit"])
        expect((await get(path, member.cookie)).status).toBe(403);
      expect((await change(member.user.id, member.cookie)).status).toBe(403);
    }
    expect(await db.select().from(accountAuditTable)).toHaveLength(0);
  });
  it("suspends and reactivates customers with an audit trail and permanent revocation of old sessions", async () => {
    const staff = await manager();
    const customer = await register();
    const snapshot = (await db.query.usersTable.findFirst({
      where: eq(usersTable.id, customer.user.id),
    }))!;
    const second = await post("/auth/login", account);
    const secondCookie = second.headers.get("set-cookie")!.split(";")[0];
    const changed = await change(customer.user.id, staff.cookie);
    expect(changed.status).toBe(200);
    expect(await changed.json()).toMatchObject({
      id: customer.user.id,
      statusVersion: 1,
      suspendedAt: expect.any(String),
      auditId: expect.any(String),
    });
    for (const cookie of [customer.cookie, secondCookie])
      expect(
        (await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } }))
          .status,
      ).toBe(401);
    expect((await post("/auth/login", account)).status).toBe(403);
    expect(
      (
        await change(
          customer.user.id,
          staff.cookie,
          1,
          "reactivate",
          "Investigation completed; access restored.",
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await fetch(`${base}/api/auth/me`, {
          headers: { Cookie: customer.cookie },
        })
      ).status,
    ).toBe(401);
    expect((await post("/auth/login", account)).status).toBe(200);
    const staleResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      cookie: vi.fn(),
    };
    expect(
      await issueSession(staleResponse as unknown as Response, snapshot),
    ).toBe(false);
    const audit = await get(
      `/account-audit?targetId=${customer.user.id}`,
      staff.cookie,
    );
    expect(audit.headers.get("cache-control")).toBe("no-store");
    const auditBody = await audit.json();
    expect(ListAccountAuditResponse.safeParse(auditBody).success).toBe(true);
    expect(auditBody).toMatchObject({
      items: [
        {
          action: "reactivate",
          actorId: staff.user.id,
          targetUserId: customer.user.id,
          statusVersion: 2,
          suspendedAt: null,
        },
        {
          action: "suspend",
          actorId: staff.user.id,
          targetUserId: customer.user.id,
          statusVersion: 1,
          reason: "Repeated policy violations confirmed.",
        },
      ],
    });
    const auditId = z
      .object({ items: z.array(z.object({ id: z.string() })) })
      .parse(auditBody).items[0].id;
    expect(
      (
        await fetch(`${base}/api/admin/account-audit/${auditId}`, {
          method: "DELETE",
          headers: { ...headers, Cookie: staff.cookie },
        })
      ).status,
    ).toBe(404);
    expect(await db.select().from(accountAuditTable)).toHaveLength(2);
    // The original active state is not the same version after reactivation.
    expect((await change(customer.user.id, staff.cookie, 0)).status).toBe(409);
  });
  it("protects self and all staff accounts; validates reasons and strips no privileged inputs silently", async () => {
    const staff = await manager();
    const other = await register();
    expect((await change(staff.user.id, staff.cookie)).status).toBe(403);
    for (const role of [
      "manager",
      "developer",
      "representative",
      "china_representative",
    ] as const) {
      await db
        .update(usersTable)
        .set({ role })
        .where(eq(usersTable.id, other.user.id));
      expect((await change(other.user.id, staff.cookie)).status).toBe(403);
    }
    await db
      .update(usersTable)
      .set({ role: "buyer" })
      .where(eq(usersTable.id, other.user.id));
    for (const bad of [
      { reason: "short" },
      { reason: "x".repeat(1001) },
      { expectedVersion: -1 },
      { expectedVersion: 0.1 },
      { role: "manager" },
      { action: "delete" },
    ]) {
      expect(
        (
          await post(
            `/admin/accounts/${other.user.id}/status`,
            {
              action: "suspend",
              expectedVersion: 0,
              reason: "Confirmed abuse report.",
              ...bad,
            },
            staff.cookie,
          )
        ).status,
      ).toBe(400);
    }
    expect((await change(crypto.randomUUID(), staff.cookie)).status).toBe(404);
    expect(await db.select().from(accountAuditTable)).toHaveLength(0);
  });
  it("allows only one concurrent status change and records exactly one audit event", async () => {
    const staff = await manager();
    const customer = await register();
    const responses = await Promise.all([
      change(customer.user.id, staff.cookie),
      change(customer.user.id, staff.cookie),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await db.select().from(accountAuditTable)).toHaveLength(1);
  });
  it("rolls back suspension and session revocation when the audit cannot be saved", async () => {
    const staff = await manager();
    const customer = await register();
    await database.exec(`CREATE FUNCTION fail_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END $$;
      CREATE TRIGGER fail_test_audit BEFORE INSERT ON account_audit FOR EACH ROW EXECUTE FUNCTION fail_test_audit();`);
    try {
      expect((await change(customer.user.id, staff.cookie)).status).toBe(503);
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, customer.user.id),
      });
      expect(user?.suspendedAt).toBeNull();
      expect(user?.accountStatusVersion).toBe(0);
      expect(
        (
          await fetch(`${base}/api/auth/me`, {
            headers: { Cookie: customer.cookie },
          })
        ).status,
      ).toBe(200);
      expect(await db.select().from(accountAuditTable)).toHaveLength(0);
    } finally {
      await database.exec(
        "DROP TRIGGER fail_test_audit ON account_audit; DROP FUNCTION fail_test_audit();",
      );
    }
  });
  it("rechecks the manager's role and session inside the status transaction", async () => {
    const staff = await manager();
    const customer = await register();
    const claims = verifyAuthToken(staff.cookie.split("=")[1]);
    const input = {
      action: "suspend" as const,
      expectedVersion: 0,
      reason: "Confirmed abuse report.",
    };
    await db
      .update(usersTable)
      .set({ role: "buyer" })
      .where(eq(usersTable.id, staff.user.id));
    expect(
      (
        await changeAccountStatus(
          staff.user.id,
          claims.sid,
          customer.user.id,
          input,
        )
      ).status,
    ).toBe(403);
    await db
      .update(usersTable)
      .set({ role: "manager" })
      .where(eq(usersTable.id, staff.user.id));
    await post("/auth/logout", {}, staff.cookie);
    expect(
      (
        await changeAccountStatus(
          staff.user.id,
          claims.sid,
          customer.user.id,
          input,
        )
      ).status,
    ).toBe(401);
    expect(await db.select().from(accountAuditTable)).toHaveLength(0);
  });
  it("paginates and filters real customer records without credentials or wildcard search surprises", async () => {
    const staff = await manager();
    await db.insert(usersTable).values(
      Array.from({ length: 27 }, (_, i) => ({
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        role: "buyer" as const,
      })),
    );
    await db.insert(usersTable).values({
      name: "Literal %_ user",
      email: "literal@example.com",
      role: "seller",
      suspendedAt: new Date(),
    });
    const first = await get("/accounts", staff.cookie);
    expect(first.headers.get("cache-control")).toBe("no-store");
    const schema = z.object({
      items: z.array(
        z.object({ id: z.string(), name: z.string() }).passthrough(),
      ),
      hasMore: z.boolean(),
    });
    const firstBody = await first.json();
    expect(ListManagedAccountsResponse.safeParse(firstBody).success).toBe(true);
    const one = schema.parse(firstBody);
    const two = schema.parse(
      await (await get("/accounts?page=1", staff.cookie)).json(),
    );
    expect(one.items).toHaveLength(25);
    expect(one.hasMore).toBe(true);
    expect(two.items).toHaveLength(3);
    expect(two.hasMore).toBe(false);
    expect(new Set([...one.items, ...two.items].map((i) => i.id)).size).toBe(
      28,
    );
    expect(one.items[0]).not.toHaveProperty("passwordHash");
    expect(one.items[0]).not.toHaveProperty("googleId");
    expect(
      schema.parse(await (await get("/accounts?q=%25_", staff.cookie)).json())
        .items,
    ).toHaveLength(1);
    expect(
      schema.parse(
        await (await get("/accounts?status=suspended", staff.cookie)).json(),
      ).items,
    ).toHaveLength(1);
    expect(await (await get("/accounts/summary", staff.cookie)).json()).toEqual(
      { total: 28, active: 27, suspended: 1 },
    );
    expect((await get("/accounts?page=-1", staff.cookie)).status).toBe(400);
    expect(
      (await get("/account-audit?targetId=bad", staff.cookie)).status,
    ).toBe(400);
  });
});

describe("bounded public catalogue", () => {
  async function seed(
    rows: Array<Partial<typeof productsTable.$inferInsert>> = [],
  ) {
    const [seller] = await db
      .insert(usersTable)
      .values({
        name: "Catalogue seller",
        email: "catalogue@example.com",
        role: "seller",
      })
      .returning();
    return db
      .insert(productsTable)
      .values(
        rows.map((row, i) => ({
          sellerId: seller.id,
          title: `Product ${i}`,
          description: "A published catalogue product.",
          category: "Electronics",
          price: 10,
          stockCount: 3,
          images: ["data:image/png;base64,iVBORw0KGgo="],
          createdAt: new Date("2026-01-01T00:00:00Z"),
          ...row,
        })),
      )
      .returning();
  }
  async function get(query = "") {
    const response = await fetch(
      `${base}/api/products${query ? `?${query}` : ""}`,
    );
    expect(response.status).toBe(200);
    return ListCatalogueProductsResponse.parse(await response.json());
  }
  it("bounds every page, keeps ties deterministic and excludes other channels and unpublished rows", async () => {
    await seed([
      ...Array.from({ length: 55 }, (_, i) => ({
        title: `Public product ${i}`,
      })),
      { channel: "shop" },
      { status: "unpublished" },
    ]);
    const first = await get();
    expect(first).toMatchObject({
      total: 55,
      page: 0,
      pageSize: 24,
      hasMore: true,
    });
    expect(first.items).toHaveLength(24);
    const second = await get("page=1"),
      last = await get("page=2");
    expect(last.items).toHaveLength(7);
    expect(last.hasMore).toBe(false);
    expect(
      new Set([...first.items, ...second.items, ...last.items].map((p) => p.id))
        .size,
    ).toBe(55);
    expect((await get()).items.map((p) => p.id)).toEqual(
      first.items.map((p) => p.id),
    );
    expect(await get("page=10000")).toMatchObject({
      items: [],
      total: 55,
      hasMore: false,
    });
    expect((await get("pageSize=48")).items).toHaveLength(48);
  });
  it("filters and sorts the whole catalogue before paging, including stock=false", async () => {
    await seed(
      Array.from({ length: 30 }, (_, i) => ({
        title: `Item ${i}`,
        price: i + 1,
        rating: i % 2 ? 4.5 : 2,
        stockCount: i % 3 ? 2 : 0,
        category: i < 20 ? "Electronics" : "Furniture",
      })),
    );
    expect(
      (await get("sort=price-asc&pageSize=2&page=1")).items.map((p) => p.price),
    ).toEqual([3, 4]);
    expect(
      (await get("sort=price-desc&pageSize=2")).items.map((p) => p.price),
    ).toEqual([30, 29]);
    const page = await get(
      "category=Furniture&minPrice=24&maxPrice=30&minRating=4&inStock=true&sort=price-desc&pageSize=2",
    );
    expect(page.items.map((p) => p.price)).toEqual([30, 26]);
    expect(page.total).toBe(3);
    expect((await get("inStock=false")).total).toBe(30);
    expect((await get("inStock=true")).total).toBe(20);
    expect((await get("sort=rating&pageSize=1")).items[0].rating).toBe(4.5);
  });
  it("treats search wildcards and SQL-looking text literally and searches seller names", async () => {
    await seed([
      { title: "Literal 50%_ item" },
      { title: "Literal 50XX item" },
    ]);
    expect(
      (await get("q=" + encodeURIComponent("50%_"))).items.map((p) => p.title),
    ).toEqual(["Literal 50%_ item"]);
    expect(await get("q=" + encodeURIComponent("' OR 1=1 --"))).toMatchObject({
      total: 0,
      items: [],
    });
    expect((await get("q=Catalogue%20seller")).total).toBe(2);
  });
  it("sorts real discounts by percentage and handles null, equal and lower original prices", async () => {
    await seed([
      { title: "Half price", price: 5, originalPrice: 10 },
      { title: "Ten percent", price: 90, originalPrice: 100 },
      { originalPrice: null },
      { originalPrice: 10 },
      { originalPrice: 1 },
    ]);
    const page = await get("sort=discount&discounted=true");
    expect(page.items.map((p) => p.title)).toEqual([
      "Half price",
      "Ten percent",
    ]);
    expect(page.total).toBe(2);
    expect((await get("discounted=false")).total).toBe(5);
  });
  it("counts all published categories and normalizes legacy shop labels", async () => {
    await seed([
      ...Array.from({ length: 27 }, () => ({ category: "Furniture" })),
      { category: "Electronics", status: "unpublished" },
      { channel: "shop", category: "Wigs & Hair" },
      { channel: "shop", category: "Other", specs: { department: "wigs" } },
      { channel: "shop", category: "wigs", stockCount: 0 },
    ]);
    const local = await fetch(
      `${base}/api/products/categories?channel=marketplace`,
    );
    expect(ListCatalogueCategoriesResponse.parse(await local.json())).toEqual([
      {
        category: "Furniture",
        count: 27,
        image: "data:image/png;base64,iVBORw0KGgo=",
      },
    ]);
    const shop = await fetch(`${base}/api/products/categories?channel=shop`);
    expect(shop.status).toBe(200);
    expect(ListCatalogueCategoriesResponse.parse(await shop.json())).toEqual([
      { category: "wigs", count: 3, image: "data:image/png;base64,iVBORw0KGgo=" },
    ]);
    expect((await get("channel=shop&category=wigs")).total).toBe(3);
  });
  it("keeps related items bounded, published, canonical and in the same channel", async () => {
    const rows = await seed([
      { channel: "shop", category: "Wigs & Hair" },
      ...Array.from({ length: 9 }, () => ({
        channel: "shop" as const,
        category: "wigs",
      })),
      { category: "wigs" },
      { channel: "shop", category: "wigs", status: "unpublished" },
    ]);
    const response = await fetch(`${base}/api/products/${rows[0].id}/related`);
    expect(response.status).toBe(200);
    const related = z
      .array(
        z.object({ id: z.string(), channel: z.string(), status: z.string() }),
      )
      .parse(await response.json());
    expect(related).toHaveLength(6);
    expect(
      related.every(
        (p) =>
          p.channel === "shop" && p.status === "active" && p.id !== rows[0].id,
      ),
    ).toBe(true);
    expect(
      await (
        await fetch(`${base}/api/products/${rows.at(-1)!.id}/related`)
      ).json(),
    ).toEqual([]);
  });
  it("rejects malformed, unbounded, conflicting and unknown filters", async () => {
    for (const query of [
      "page=-1",
      "page=1.5",
      "page=10001",
      "pageSize=0",
      "pageSize=49",
      "pageSize=NaN",
      "pageSize=2&pageSize=3",
      "channel=secret",
      "sort=popular",
      "minPrice=-1",
      "maxPrice=100000000",
      "minPrice=50&maxPrice=5",
      "minRating=6",
      "inStock=1",
      "discounted=maybe",
      "q=" + "a".repeat(121),
      "category=" + "a".repeat(81),
      "status=unpublished",
    ]) {
      expect((await fetch(`${base}/api/products?${query}`)).status, query).toBe(
        400,
      );
    }
    expect(
      (await fetch(`${base}/api/products/categories?channel=invalid`)).status,
    ).toBe(400);
    expect(await get()).toMatchObject({ items: [], total: 0, hasMore: false });
  });
});

describe("account profiles, onboarding and policy acceptance", () => {
  const buyerProfile = {
    country: "Ghana",
    city: "Accra",
    language: "English",
    accountType: "individual",
    purpose: "hiring",
  };
  const professional = {
    country: "Ghana",
    city: "Kumasi",
    language: "English, Twi",
    accountType: "business",
    company: "Owusu Electrical",
    headline: "Residential electrician and solar installer",
    about:
      "I install and maintain residential electrical systems and solar panels, helping clients plan safe, reliable home improvements.",
    skills: ["Wiring", "Solar systems"],
    experience: "5_10",
    workMode: "on_site",
    website: "https://owusu.example.com",
  };
  const send = (method: string, path: string, data: unknown, cookie?: string) =>
    fetch(`${base}/api${path}`, {
      method,
      headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(data),
    });
  const read = async (cookie: string) => {
    const response = await fetch(`${base}/api/account/profile`, { headers: { Cookie: cookie } });
    expect(response.status).toBe(200);
    return response.json() as Promise<{
      profile: (Record<string, unknown> & { version: number }) | null;
      onboardingCompletedAt: string | null;
      policies: { current: Record<string, string>; accepted: { policy: string; version: string }[] };
    }>;
  };
  const users = async () => (await database.query<{ n: number }>("SELECT count(*)::int n FROM users")).rows[0].n;

  it("requires server-recorded policy acceptance and creates nothing on an invalid profile", async () => {
    const { acceptedTerms: _accepted, ...withoutTerms } = account;
    const refused = await post("/auth/register", withoutTerms);
    expect(refused.status).toBe(400);
    expect(((await refused.json()) as { error: string }).error).toContain("Terms of Service");
    const incomplete = await post("/auth/register", {
      ...account,
      role: "seller",
      profile: { ...professional, headline: "Short" },
    });
    expect(incomplete.status).toBe(400);
    expect(((await incomplete.json()) as { error: string }).error).toContain("headline");
    expect(await users()).toBe(0);
  });

  it("saves a professional's profile with the account and publishes only professional fields", async () => {
    const { user, cookie } = await register({ ...account, role: "seller", profile: professional } as typeof account);
    expect(user).toMatchObject({ onboardingCompleted: true });
    const own = await read(cookie);
    expect(own.profile).toMatchObject({ ...professional, version: 1 });
    expect(own.onboardingCompletedAt).not.toBeNull();
    expect(own.policies.accepted.map((p) => `${p.policy}@${p.version}`).sort()).toEqual([
      `privacy@${own.policies.current.privacy}`,
      `terms@${own.policies.current.terms}`,
    ]);
    const publicProfile = (await (await fetch(`${base}/api/profiles/${user.id}`)).json()) as Record<string, unknown>;
    expect(publicProfile).toMatchObject({ headline: professional.headline, skills: professional.skills, workMode: "on_site" });
    for (const hidden of ["country", "city", "language", "company", "accountType", "purpose", "email"])
      expect(publicProfile).not.toHaveProperty(hidden);
  });

  it("updates with version checks and validates against the stored role", async () => {
    const { user, cookie } = await register();
    expect(user).toMatchObject({ onboardingCompleted: false });
    expect((await read(cookie)).profile).toBeNull();
    expect((await send("PUT", "/account/profile", { expectedVersion: 0, profile: buyerProfile })).status).toBe(401);
    // A buyer must say how they'll use Fotizo; professional fields are not kept.
    const missing = await send("PUT", "/account/profile", { expectedVersion: 0, profile: { ...buyerProfile, purpose: "" } }, cookie);
    expect(missing.status).toBe(400);
    const created = await send(
      "PUT",
      "/account/profile",
      { expectedVersion: 0, profile: { ...buyerProfile, headline: "Should not be stored" } },
      cookie,
    );
    expect(created.status).toBe(200);
    expect(((await created.json()) as { profile: Record<string, unknown> }).profile).toMatchObject({ version: 1, headline: "" });
    expect((await read(cookie)).onboardingCompletedAt).not.toBeNull();

    const edit = { expectedVersion: 1, profile: { ...buyerProfile, city: "Tema" } };
    const [first, second] = await Promise.all([
      send("PUT", "/account/profile", edit, cookie),
      send("PUT", "/account/profile", edit, cookie),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect((await read(cookie)).profile).toMatchObject({ city: "Tema", version: 2 });
    expect((await send("PUT", "/account/profile", { expectedVersion: 0, profile: buyerProfile }, cookie)).status).toBe(409);
    for (const profile of [
      { ...buyerProfile, role: "manager" },
      { ...buyerProfile, website: "http://insecure.example.com" },
      { ...buyerProfile, purpose: "Shopping for myself" },
      { ...buyerProfile, skills: Array.from({ length: 11 }, (_, i) => `Skill ${i}`) },
    ])
      expect((await send("PUT", "/account/profile", { expectedVersion: 2, profile }, cookie)).status).toBe(400);
    expect((await fetch(`${base}/api/profiles/${user.id}`)).status).toBe(404);
  });

  it("completes a Google signup with its profile and policy acceptance in one step", async () => {
    const pendingToken = signPendingGoogleSignupToken({ googleId: "google-new", email: "new@example.com", name: "Nana" });
    expect((await post("/auth/google/complete", { pendingToken, role: "buyer", profile: buyerProfile })).status).toBe(400);
    expect(await users()).toBe(0);
    const response = await post("/auth/google/complete", {
      pendingToken,
      role: "buyer",
      acceptedTerms: true,
      profile: buyerProfile,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ onboardingCompleted: true, verified: true });
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    const own = await read(cookie);
    expect(own.profile).toMatchObject({ purpose: "hiring", version: 1 });
    expect(own.policies.accepted).toHaveLength(2);
  });
});
