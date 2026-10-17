// One-off: publish the curated Alibaba selection (restored-alibaba-products.json)
// so it shows in the shop and can be bought. Only those 978 held listings
// change; the uncurated archive stays held. All or nothing: if the count is not
// exactly 978 nothing is changed. Pass --undo to unpublish them again.
import pg from "pg";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const NS = "6f9d1c1e-6f27-4f3a-9a2f-1d7b0c5a8e42";
const uuid = (name) => {
  const h = createHash("sha1").update(Buffer.from(NS.replace(/-/g, ""), "hex")).update(name, "utf8").digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = b.toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
};
const curated = new URL("../../artifacts/fotizo/src/features/shop/data/restored-alibaba-products.json", import.meta.url);
const ids = JSON.parse(readFileSync(curated, "utf8")).map((p) => uuid(p.id));
const undo = process.argv.includes("--undo");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const { rows } = await client.query(
    undo
      ? `UPDATE products SET status = 'unpublished', moderation_hold = true
         WHERE id = ANY($1::uuid[]) AND source_platform = 'alibaba' AND status = 'active'
           AND id <> '3cb361ca-4fad-576e-8147-e3a4b081b7d2'
         RETURNING id`
      : `UPDATE products SET status = 'active', moderation_hold = false
         WHERE id = ANY($1::uuid[]) AND source_platform = 'alibaba' AND moderation_hold
           AND status = 'unpublished' AND deleted_at IS NULL
         RETURNING id`,
    [ids],
  );
  if (rows.length !== 978) throw new Error(`expected 978 listings, found ${rows.length}; nothing was changed`);
  await client.query("COMMIT");
  console.log(`${undo ? "Unpublished" : "Published"} ${rows.length} curated Alibaba listings.`);
} catch (error) {
  await client.query("ROLLBACK");
  console.log("Stopped:", error.message);
}
const { rows } = await client.query(
  "SELECT status, moderation_hold AS held, count(*)::int AS listings FROM products WHERE source_platform = 'alibaba' GROUP BY 1, 2 ORDER BY 1",
);
console.table(rows);
client.release();
await pool.end();
