import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { readFile } from "node:fs/promises";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { z } from "zod";

vi.mock("@workspace/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../../lib/db/src/schema");
  const client = new PGlite();
  return { ...schema, db: drizzle(client, { schema }), testDatabase: client };
});
import app from "./app";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { resolveSession } from "./lib/sessions";
import {
  signAuthToken,
  signPendingGoogleSignupToken,
  verifyAuthToken,
  verifyPendingGoogleSignupToken,
} from "./lib/jwt";
import { consumeAuthAttempt } from "./middlewares/security";

let server: Server;
let base: string;
let database: import("@electric-sql/pglite").PGlite;
const account = {
  name: "Alice",
  email: "alice@example.com",
  password: "valid-password",
  role: "buyer",
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
  await database.exec(`CREATE TYPE user_role AS ENUM ('buyer','seller','manager','developer','representative','china_representative');
    CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL UNIQUE,
    password_hash text, google_id text UNIQUE, role user_role NOT NULL DEFAULT 'buyer', avatar text,
    verified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());`);
  const migration = await readFile(
    new URL("../../../lib/db/migrations/0001_sessions.sql", import.meta.url),
    "utf8",
  );
  await database.exec(migration);
  await database.exec(migration); // Additive migration is safe against an already upgraded schema.
  await database.exec(`CREATE TYPE product_status AS ENUM ('active','unpublished');
    CREATE TABLE products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text NOT NULL,
    price numeric(10,2) NOT NULL, original_price numeric(10,2), rating real NOT NULL DEFAULT 0, review_count integer NOT NULL DEFAULT 0,
    seller_id uuid NOT NULL REFERENCES users(id), category text NOT NULL, images text[] NOT NULL DEFAULT '{}',
    stock_count integer NOT NULL DEFAULT 0, tags text[] NOT NULL DEFAULT '{}', specs jsonb NOT NULL DEFAULT '{}',
    status product_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now());`);
  const channels = await readFile(
    new URL(
      "../../../lib/db/migrations/0002_product_channels.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await database.exec(channels);
  await database.exec(channels);
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
  it("does not create unpaid orders while checkout is unavailable", async () => {
    const { cookie } = await register();
    const response = await post(
      "/orders",
      { items: [{ productId: crypto.randomUUID(), quantity: 1 }] },
      cookie,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("not available yet"),
    });
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
    images: ["https://example.com/photo.jpg"],
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
    expect(shop).toEqual([
      expect.objectContaining({ sellerId: rep.user.id, channel: "shop" }),
    ]);
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
