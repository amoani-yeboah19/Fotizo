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
  rejectKey: false,
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
      if (stub.rejectKey) {
        res.writeHead(400).end(JSON.stringify({ statusCode: "403", error: "Unauthorized", message: "Invalid Compact JWS" }));
        return;
      }
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
  stub.rejectKey = false;
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
    const details = { faqs: [{ question: "What is included?", answer: "A five-page responsive website." }], requirements: ["Please provide your business brief."], gallery: [serviceShot] };
    const serviceCreated = await send("POST", "/services", { ...service, avatar: serviceShot, details, packages: [{ ...service.packages[0], revisions: 2, features: ["Responsive layout"] }] }, seller.cookie);
    expect(serviceCreated.status).toBe(201);
    const savedService = await serviceCreated.json() as { id: string };
    const roundTrip = await fetch(`${base}/api/services/${savedService.id}`);
    expect(await roundTrip.json()).toMatchObject({ details, packages: [expect.objectContaining({ revisions: 2, features: ["Responsive layout"] })] });
    expect((await send("POST", "/services", { ...service, avatar: serviceShot, details: { ...details, gallery: [theirs] } }, seller.cookie)).status).toBe(400);
    expect((await send("PATCH", `/services/${savedService.id}`, { ...service, avatar: serviceShot, details }, seller.cookie)).status).toBe(200);
  });

  it("lets managers upload vehicle photos and staff reuse photos already on the catalogue", async () => {
    const manager = await account("manager");
    const desk = await account("china_representative");
    // Managers add and edit vehicles, so they must be able to upload their photos.
    const photo = await uploaded("product", manager.cookie);
    // This stub storage serves plain http, which vehicle saving refuses, so
    // the vehicle is added directly.
    await database.query(
      `INSERT INTO vehicles (slug, make, model, body_type, fuel, seats, transmission, drivetrain, powertrain, efficiency,
         landed_price, lead_time_min_weeks, lead_time_max_weeks, images, highlights, description)
       VALUES ('byd-atto-3-test', 'BYD', 'Atto 3', 'suv', 'electric', 5, 'Automatic', 'FWD', 'Electric motor', '420 km',
         25000, 6, 10, $1, '{}', 'Compact electric SUV')`,
      [[photo]],
    );
    const { imagesOnVehicles } = await import("./lib/storage");
    const elsewhere = await uploaded("product", desk.cookie);
    expect(await imagesOnVehicles([photo, elsewhere])).toEqual([photo]);
  });

  it("lets the China desk publish its held listings, but not ones a manager took down", async () => {
    const desk = await account("china_representative");
    const created = await send("POST", "/products", { ...product, images: [await uploaded("product", desk.cookie)] }, desk.cookie);
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect((await upload("service", JPEG, desk.cookie)).status).toBe(403);
    const hold = () => database.query("UPDATE products SET status = 'unpublished', moderation_hold = true WHERE id = $1", [id]);
    const state = async () => (await database.query<{ status: string; moderation_hold: boolean }>("SELECT status, moderation_hold FROM products WHERE id = $1", [id])).rows[0];

    // Held on import: the China desk publishes it and the hold is lifted.
    await hold();
    expect((await send("PATCH", `/products/${id}`, { status: "active" }, desk.cookie)).status).toBe(200);
    expect(await state()).toEqual({ status: "active", moderation_hold: false });

    // Taken down by a manager: only a manager can republish it.
    const manager = await account("manager");
    const audit = (action: string) =>
      database.query(
        "INSERT INTO admin_audit (actor_id, actor_name, action, target_type, target_id, target_label, reason) VALUES ($1, 'Manager', $2, 'product', $3, 'Cordless drill', 'Review')",
        [manager.id, action, id],
      );
    await hold();
    await audit("product.unpublish");
    const refused = await send("PATCH", `/products/${id}`, { status: "active" }, desk.cookie);
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({ error: expect.stringMatching(/manager took this listing down/) });
    expect(await state()).toEqual({ status: "unpublished", moderation_hold: true });
    expect((await send("PATCH", `/products/${id}`, { title: "Cordless drill kit" }, desk.cookie)).status).toBe(200);

    // Sellers' holds are still lifted by staff.
    const seller = await account("seller");
    const listed = (await (await send("POST", "/products", { ...product, images: [await uploaded("product", seller.cookie)] }, seller.cookie)).json()) as { id: string };
    await database.query("UPDATE products SET status = 'unpublished', moderation_hold = true WHERE id = $1", [listed.id]);
    expect((await send("PATCH", `/products/${listed.id}`, { status: "active" }, seller.cookie)).status).toBe(409);
  });

  it("keeps a shop listing's supplier data when it is edited and moves it with its category", async () => {
    const desk = await account("china_representative");
    const create = (data: object) => send("POST", "/products", { ...product, images: [], ...data }, desk.cookie);
    const other = (await (await create({ category: "Men's Clothing" })).json()) as { id: string };
    await database.query(`UPDATE products SET specs = '{"department":"mens"}' WHERE id = $1`, [other.id]);
    // Owners cannot set system data such as sales counts or the supplier link.
    const created = await create({ category: "Wigs & Hair", specs: { Colour: "Black", unitsSold: "9999", supplierListing: "https://evil.example" } });
    const { id } = (await created.json()) as { id: string };
    const stored = async () => (await database.query<{ category: string; specs: Record<string, string> }>("SELECT category, specs FROM products WHERE id = $1", [id])).rows[0];
    expect((await stored()).specs).toEqual({ Colour: "Black" });

    await database.query(
      `UPDATE products SET specs = specs || '{"department":"wigs","supplierListing":"https://detail.1688.com/offer/1.html","unitsSold":"40"}' WHERE id = $1`,
      [id],
    );
    expect((await send("PATCH", `/products/${id}`, { specs: { Colour: "Brown", unitsSold: "1" } }, desk.cookie)).status).toBe(200);
    expect((await stored()).specs).toEqual({
      Colour: "Brown",
      department: "wigs",
      supplierListing: "https://detail.1688.com/offer/1.html",
      unitsSold: "40",
    });
    expect((await send("PATCH", `/products/${id}`, { category: "Men's Clothing" }, desk.cookie)).status).toBe(200);
    expect(await stored()).toMatchObject({ category: "Men's Clothing", specs: { Colour: "Brown", department: "mens", unitsSold: "40" } });
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

describe("storage status for operators", () => {
  const status = async (cookie?: string) => {
    const response = await fetch(`${base}/api/uploads/status`, { headers: cookie ? { Cookie: cookie } : {} });
    return { code: response.status, body: (await response.json()) as Record<string, unknown> };
  };

  it("explains missing settings, a rejected key and a working setup without exposing the key", async () => {
    const buyer = await account("buyer");
    expect((await status()).code).toBe(401);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await status(buyer.cookie)).body).toMatchObject({ configured: false, ready: false });
    // Quotes pasted around a value in a hosting dashboard are ignored.
    process.env.SUPABASE_SERVICE_ROLE_KEY = '"service-role-test"';
    stub.rejectKey = true;
    const rejected = await status(buyer.cookie);
    expect(rejected.body).toMatchObject({ configured: true, ready: false });
    expect(String(rejected.body.problem)).toContain("service_role");
    expect(JSON.stringify(rejected.body)).not.toContain("service-role-test");
    stub.rejectKey = false;
    resetStorageState();
    expect((await status(buyer.cookie)).body).toMatchObject({ ready: true, problem: null, bucket: "fotizo-images" });
    expect(stub.requests.at(-1)).toMatchObject({ auth: "Bearer service-role-test" });
  });
});
