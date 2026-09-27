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
import { resetStorageState } from "./lib/storage";

let server: Server;
let supabase: Server;
let base: string;
let storageUrl: string;
let database: import("@electric-sql/pglite").PGlite;
const headers = { "X-Fotizo-Request": "1", Origin: "http://localhost:5173" };

// A stand-in for Supabase Storage that records what it was sent.
const stub = {
  requests: [] as { method: string; url: string; auth?: string; apikey?: string; type?: string; upsert?: string; bytes: number }[],
  bucketExists: false,
  failObjects: false,
};

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50, 2)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const upload = (purpose: string, body: Buffer, cookie?: string, type = "image/jpeg") =>
  fetch(`${base}/api/uploads/images?purpose=${purpose}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": type, ...(cookie ? { Cookie: cookie } : {}) },
    body: new Uint8Array(body),
  });
const send = (method: string, path: string, data: unknown, cookie: string) =>
  fetch(`${base}/api${path}`, {
    method,
    headers: { ...headers, "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(data),
  });

let count = 0;
async function account(role = "seller") {
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name: `User ${++count}`, email: `u${count}@example.com`, password: "valid-password", role: "buyer", acceptedTerms: true }),
  });
  const { id } = (await response.json()) as { id: string };
  if (role !== "buyer") await database.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  return { id, cookie: response.headers.get("set-cookie")!.split(";")[0] };
}
const uploaded = async (purpose: string, cookie: string, body = JPEG) => {
  const response = await upload(purpose, body, cookie);
  expect(response.status).toBe(201);
  return ((await response.json()) as { url: string }).url;
};
const product = { title: "Cordless drill", category: "Tools", description: "18V drill with two batteries and a charger.", price: 120, originalPrice: null, stockCount: 3 };

beforeAll(async () => {
  database = ((await import("@workspace/db")) as unknown as { testDatabase: typeof database }).testDatabase;
  await createTestSchema(database);
  supabase = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      stub.requests.push({
        method: req.method!,
        url: req.url!,
        auth: req.headers.authorization,
        apikey: req.headers.apikey as string | undefined,
        type: req.headers["content-type"],
        upsert: req.headers["x-upsert"] as string | undefined,
        bytes: body.length,
      });
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/storage/v1/bucket") {
        // Supabase answers an existing bucket with a 400 carrying statusCode "409".
        if (stub.bucketExists) {
          res.writeHead(400).end(JSON.stringify({ statusCode: "409", error: "Duplicate", message: "The resource already exists" }));
          return;
        }
        stub.bucketExists = true;
        res.writeHead(200).end(JSON.stringify({ name: "fotizo-images" }));
        return;
      }
      if (stub.failObjects) {
        res.writeHead(500).end("{}");
        return;
      }
      res.writeHead(200).end(JSON.stringify({ Key: req.url }));
    });
  });
  await new Promise<void>((resolve) => supabase.listen(0, "127.0.0.1", resolve));
  storageUrl = `http://127.0.0.1:${(supabase.address() as { port: number }).port}`;
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await new Promise<void>((resolve) => supabase.close(() => resolve()));
  await database.close();
});
beforeEach(async () => {
  await database.exec("TRUNCATE users, sessions, auth_rate_limits, products, services CASCADE");
  process.env.SUPABASE_URL = `${storageUrl}/`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
  stub.requests = [];
  stub.bucketExists = false;
  stub.failObjects = false;
  resetStorageState();
});

describe("image uploads to Supabase Storage", () => {
  it("only accepts real JPEG, PNG or WebP images from accounts allowed to list", async () => {
    const seller = await account("seller");
    const buyer = await account("buyer");
    expect((await upload("product", JPEG)).status).toBe(401);
    expect((await upload("product", JPEG, buyer.cookie)).status).toBe(403);
    expect((await upload("banner", JPEG, seller.cookie)).status).toBe(400);
    // The declared type is ignored: an SVG labelled as a JPEG is refused.
    expect((await upload("product", SVG, seller.cookie, "image/jpeg")).status).toBe(415);
    expect((await upload("product", Buffer.alloc(0), seller.cookie)).status).toBe(400);
    const tooLarge = Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)]);
    expect((await upload("product", tooLarge, seller.cookie)).status).toBe(413);
    expect(stub.requests).toHaveLength(0);
  });

  it("stores the file with the service key, creates the bucket once and records the owner", async () => {
    const seller = await account("seller");
    const first = await upload("product", PNG, seller.cookie, "application/octet-stream");
    expect(first.status).toBe(201);
    const body = (await first.json()) as { url: string; contentType: string };
    expect(body.contentType).toBe("image/png");
    expect(body.url).toMatch(
      new RegExp(`^${storageUrl}/storage/v1/object/public/fotizo-images/product/${seller.id}/[0-9a-f-]{36}\\.png$`),
    );
    await uploaded("product", seller.cookie);
    const objects = stub.requests.filter((r) => r.url.startsWith("/storage/v1/object/"));
    expect(objects).toHaveLength(2);
    expect(objects[0]).toMatchObject({ method: "POST", auth: "Bearer service-role-test", apikey: "service-role-test", type: "image/png", upsert: "false", bytes: PNG.length });
    expect(stub.requests.filter((r) => r.url === "/storage/v1/bucket")).toHaveLength(1);
    const { rows } = await database.query<{ n: number }>("SELECT count(*)::int n FROM media_uploads WHERE owner_id = $1", [seller.id]);
    expect(rows[0].n).toBe(2);
  });

  it("reports storage that is missing or failing without recording anything", async () => {
    const seller = await account("seller");
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await upload("product", JPEG, seller.cookie)).status).toBe(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    stub.failObjects = true;
    expect((await upload("product", JPEG, seller.cookie)).status).toBe(503);
    const { rows } = await database.query<{ n: number }>("SELECT count(*)::int n FROM media_uploads");
    expect(rows[0].n).toBe(0);
  });

  it("lets listings use only their owner's uploads, keeping photos already on the listing", async () => {
    const seller = await account("seller");
    const other = await account("seller");
    const mine = await uploaded("product", seller.cookie);
    const theirs = await uploaded("product", other.cookie);
    const serviceShot = await uploaded("service", seller.cookie);
    const create = (images: string[]) => send("POST", "/products", { ...product, images }, seller.cookie);
    expect((await create([theirs])).status).toBe(400);
    expect((await create(["https://tracker.example.com/pixel.jpg"])).status).toBe(400);
    expect((await create(["data:image/png;base64,iVBORw0KGgo="])).status).toBe(400);
    expect((await create([serviceShot])).status).toBe(400);
    const created = await create([mine]);
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const second = await uploaded("product", seller.cookie);
    expect((await send("PATCH", `/products/${id}`, { images: [second, mine] }, seller.cookie)).status).toBe(200);
    expect((await send("PATCH", `/products/${id}`, { images: [second, theirs] }, seller.cookie)).status).toBe(400);

    const service = {
      title: "Website build",
      category: "web-development",
      description: "A responsive five-page website with a contact form.",
      experience: "3–5 years",
      hourlyRate: 35,
      availability: "Weekdays",
      skills: ["React"],
      packages: [{ name: "Basic", price: 300, delivery: "7 days", description: "Five pages" }],
    };
    expect((await send("POST", "/services", { ...service, avatar: mine }, seller.cookie)).status).toBe(400);
    expect((await send("POST", "/services", { ...service, avatar: serviceShot }, seller.cookie)).status).toBe(201);
  });
});

describe("profile photos", () => {
  it("lets any account set, replace and remove its own uploaded photo", async () => {
    const buyer = await account("buyer");
    const other = await account("buyer");
    const photo = await uploaded("avatar", buyer.cookie);
    const theirs = await uploaded("avatar", other.cookie);
    const set = (avatar: string | null) => send("PUT", "/account/avatar", { avatar }, buyer.cookie);
    expect((await set(theirs)).status).toBe(400);
    expect((await set("https://tracker.example.com/me.jpg")).status).toBe(400);
    const saved = await set(photo);
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ id: buyer.id, avatar: photo });
    const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: buyer.cookie } });
    expect(await me.json()).toMatchObject({ avatar: photo });
    // Keeping the current photo is always allowed; null removes it.
    expect((await set(photo)).status).toBe(200);
    expect(await (await set(null)).json()).not.toHaveProperty("avatar");
  });

  it("lets a provider reuse their profile photo as a service photo", async () => {
    const seller = await account("seller");
    const photo = await uploaded("avatar", seller.cookie);
    await send("PUT", "/account/avatar", { avatar: photo }, seller.cookie);
    const service = {
      title: "Website build",
      category: "web-development",
      description: "A responsive five-page website with a contact form.",
      experience: "3–5 years",
      hourlyRate: 35,
      availability: "Weekdays",
      skills: ["React"],
      packages: [{ name: "Basic", price: 300, delivery: "7 days", description: "Five pages" }],
    };
    expect((await send("POST", "/services", { ...service, avatar: photo }, seller.cookie)).status).toBe(201);
  });
});
