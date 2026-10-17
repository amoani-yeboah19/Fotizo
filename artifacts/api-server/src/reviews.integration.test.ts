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
import { catalogueUuid } from "@workspace/db";

let server: Server;
let base: string;
let database: import("@electric-sql/pglite").PGlite;
const headers = { "X-Fotizo-Request": "1", Origin: "http://localhost:5173" };

let count = 0;
async function account(name = `User ${count + 1}`, role = "buyer") {
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name, email: `r${++count}@example.com`, password: "valid-password", role: "buyer", acceptedTerms: true }),
  });
  const { id } = (await response.json()) as { id: string };
  if (role !== "buyer") await database.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  return { id, cookie: response.headers.get("set-cookie")!.split(";")[0] };
}
async function product(sellerId: string, id?: string) {
  const { rows } = await database.query<{ id: string }>(
    `INSERT INTO products (${id ? "id, " : ""}title, description, price, seller_id, category, rating, review_count)
     VALUES (${id ? "$3, " : ""}'Desk lamp', 'A lamp for the desk, with a warm bulb.', 20, $1, 'Lighting', $2, 0) RETURNING id`,
    id ? [sellerId, 4.8, id] : [sellerId, 4.8],
  );
  return rows[0].id;
}
async function bought(buyerId: string, productId: string, sellerId: string, status = "delivered") {
  const { rows: [order] } = await database.query<{ id: string }>(
    "INSERT INTO orders (buyer_id, total, reference) VALUES ($1, 20, $2) RETURNING id",
    [buyerId, `FTZ-R${++count}`],
  );
  await database.query(
    "INSERT INTO order_items (order_id, product_id, product_title, product_image, seller_id, seller, price, quantity, status) VALUES ($1, $2, 'Desk lamp', '', $3, 'Seller', 20, 1, $4)",
    [order.id, productId, sellerId, status],
  );
}
const put = (cookie: string, body: object) =>
  fetch(`${base}/api/reviews`, { method: "PUT", headers: { ...headers, Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const listing = async (table: "products" | "services", id: string) =>
  (await database.query<{ rating: number; review_count: number }>(`SELECT rating, review_count FROM ${table} WHERE id = $1`, [id])).rows[0];

beforeAll(async () => {
  database = ((await import("@workspace/db")) as unknown as { testDatabase: typeof database }).testDatabase;
  await createTestSchema(database);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await database.close();
});
beforeEach(async () => {
  await database.exec("TRUNCATE users, sessions, auth_rate_limits, products, orders, order_items, services, bookings, reviews CASCADE");
});

describe("product reviews", () => {
  it("lets only buyers with a delivered order review, once, and keeps the rating in step", async () => {
    const seller = await account("Seller", "seller");
    const ama = await account("Ama Kumi Mensah");
    const kofi = await account("Kofi");
    const waiting = await account("Yaw Boateng");
    const id = await product(seller.id);
    await bought(ama.id, id, seller.id);
    await bought(kofi.id, id, seller.id);
    await bought(waiting.id, id, seller.id, "shipped");

    // Not delivered yet: no review, and the page says so.
    const refused = await put(waiting.cookie, { kind: "product", listingId: id, rating: 1 });
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual({ error: expect.stringMatching(/once your order of it has been delivered/) });
    const mineWaiting = await fetch(`${base}/api/reviews/mine?kind=product&id=${id}`, { headers: { Cookie: waiting.cookie } });
    expect(await mineWaiting.json()).toEqual({ canReview: false, review: null });

    // The listing keeps its imported rating until it has Fotizo reviews.
    expect(await listing("products", id)).toEqual({ rating: 4.8, review_count: 0 });
    const first = await put(ama.cookie, { kind: "product", listingId: id, rating: 5, comment: "Lovely warm light." });
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({ rating: 5, comment: "Lovely warm light.", author: "Ama M." });
    expect((await put(kofi.cookie, { kind: "product", listingId: id, rating: 2 })).status).toBe(201);
    expect(await listing("products", id)).toEqual({ rating: 3.5, review_count: 2 });

    // Writing again changes the same review rather than adding one.
    const edited = await put(ama.cookie, { kind: "product", listingId: id, rating: 4, comment: "Good, a little dim." });
    expect(edited.status).toBe(200);
    expect(await listing("products", id)).toEqual({ rating: 3, review_count: 2 });

    const page = (await (await fetch(`${base}/api/products/${id}/reviews`)).json()) as {
      items: { author: string; rating: number }[];
      total: number;
      average: number;
      breakdown: number[];
    };
    expect(page).toMatchObject({ total: 2, average: 3, breakdown: [0, 1, 0, 1, 0] });
    expect(page.items.map((r) => r.author).sort()).toEqual(["Ama M.", "Kofi"]);

    const mine = (await (await fetch(`${base}/api/reviews/mine?kind=product&id=${id}`, { headers: { Cookie: ama.cookie } })).json()) as {
      canReview: boolean;
      review: { id: string; rating: number };
    };
    expect(mine).toMatchObject({ canReview: true, review: { rating: 4 } });

    // Only the author can delete it; the rating follows.
    const del = (cookie: string) => fetch(`${base}/api/reviews/${mine.review.id}`, { method: "DELETE", headers: { ...headers, Cookie: cookie } });
    expect((await del(kofi.cookie)).status).toBe(404);
    expect((await del(ama.cookie)).status).toBe(204);
    expect(await listing("products", id)).toEqual({ rating: 2, review_count: 1 });
  });

  it("accepts Fotizo Shop catalogue ids for the products they are stored under", async () => {
    const desk = await account("Desk", "china_representative");
    const buyer = await account("Esi Owusu");
    const id = await product(desk.id, catalogueUuid("1688-973074422128"));
    await bought(buyer.id, id, desk.id);
    expect((await put(buyer.cookie, { kind: "product", listingId: "1688-973074422128", rating: 5 })).status).toBe(201);
    expect(await (await fetch(`${base}/api/products/1688-973074422128/reviews`)).json()).toMatchObject({ total: 1, average: 5 });
  });

  it("refuses bad ratings, long comments and unknown listings", async () => {
    const seller = await account("Seller", "seller");
    const buyer = await account("Ama");
    const id = await product(seller.id);
    await bought(buyer.id, id, seller.id);
    for (const body of [
      { kind: "product", listingId: id, rating: 0 },
      { kind: "product", listingId: id, rating: 6 },
      { kind: "product", listingId: id, rating: 4.5 },
      { kind: "product", listingId: id, rating: 4, comment: "x".repeat(2001) },
      { kind: "vehicle", listingId: id, rating: 4 },
    ])
      expect((await put(buyer.cookie, body)).status).toBe(400);
    expect((await put(buyer.cookie, { kind: "product", listingId: "no-such-product", rating: 4 })).status).toBe(403);
    expect((await fetch(`${base}/api/reviews`, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: "{}" })).status).toBe(401);
  });
});

describe("service reviews", () => {
  it("lets a customer review a service once their booking is completed", async () => {
    const provider = await account("Provider", "seller");
    const buyer = await account("Kwame Asante");
    const { rows: [service] } = await database.query<{ id: string }>(
      `INSERT INTO services (title, description, provider_id, avatar, experience, hourly_rate, category, "group", availability)
       VALUES ('Website build', 'A five-page website.', $1, '', '3-5 years', 30, 'web-development', 'freelancers', 'Weekdays') RETURNING id`,
      [provider.id],
    );
    const { rows: [booking] } = await database.query<{ id: string }>(
      `INSERT INTO bookings (reference, service_id, provider_id, buyer_id, service_title, package_name, package_price, scheduled_for, timezone, status)
       VALUES ('BK-1', $1, $2, $3, 'Website build', 'Basic', 300, now(), 'Africa/Accra', 'confirmed') RETURNING id`,
      [service.id, provider.id, buyer.id],
    );
    const review = { kind: "service", listingId: service.id, rating: 5, comment: "Fast and friendly." };
    expect((await put(buyer.cookie, review)).status).toBe(403);
    await database.query("UPDATE bookings SET status = 'completed' WHERE id = $1", [booking.id]);
    expect((await put(buyer.cookie, review)).status).toBe(201);
    expect(await listing("services", service.id)).toEqual({ rating: 5, review_count: 1 });
    expect(await (await fetch(`${base}/api/services/${service.id}/reviews`)).json()).toMatchObject({
      total: 1,
      items: [{ author: "Kwame A.", comment: "Fast and friendly." }],
    });
  });
});
