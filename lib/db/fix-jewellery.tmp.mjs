// One-off: the 62 curated jewellery listings were imported under Accessories,
// leaving the shop's Jewellery department empty. Move exactly those listings
// to Jewellery. All or nothing. Pass --undo to move them back.
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
const ids = JSON.parse(readFileSync(curated, "utf8")).filter((p) => p.category === "jewellery").map((p) => uuid(p.id));
const undo = process.argv.includes("--undo");
const [from, to] = undo ? [["Jewellery", "jewellery"], ["Accessories", "accessories"]] : [["Accessories", "accessories"], ["Jewellery", "jewellery"]];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const { rows } = await client.query(
    `UPDATE products SET category = $3, specs = specs || jsonb_build_object('department', $4::text)
     WHERE id = ANY($1::uuid[]) AND source_platform = 'alibaba' AND category = $2
     RETURNING id`,
    [ids, from[0], to[0], to[1]],
  );
  if (rows.length !== 62) throw new Error(`expected 62 listings, found ${rows.length}; nothing was changed`);
  await client.query("COMMIT");
  console.log(`Moved ${rows.length} listings from ${from[0]} to ${to[0]}.`);
} catch (error) {
  await client.query("ROLLBACK");
  console.log("Stopped:", error.message);
}
client.release();
await pool.end();
