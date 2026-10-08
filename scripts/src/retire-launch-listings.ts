// Applies the frontend's launch policy in the database: Alibaba.com products
// and the exact listings in features/catalogue/retired-listings.json are
// unpublished, so catalogue pages, totals and search agree with the storefront.
//
//   pnpm exec tsx --env-file=<api .env> src/retire-launch-listings.ts --dry-run
//   pnpm exec tsx --env-file=<api .env> src/retire-launch-listings.ts
//
// Nothing is deleted: orders, carts and saved items keep their records, and a
// manager can republish a listing. Products and services also get a moderation
// hold so their owner can't republish them from the dashboard. 1688.com goods
// are a different platform and are not affected.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { sql } from "drizzle-orm";

const DRY_RUN = process.argv.includes("--dry-run");
const HERE = dirname(fileURLToPath(import.meta.url));
const RETIRED = resolve(HERE, "../../artifacts/fotizo/src/features/catalogue/retired-listings.json");

/** A Postgres array literal (drizzle would expand a JS array into separate parameters). */
const pgArray = (ids: string[]) => `{${ids.join(",")}}`;

async function main() {
  const { db, pool } = await import("@workspace/db");
  const retired = JSON.parse(readFileSync(RETIRED, "utf8")) as { products: string[]; services: string[]; vehicles: string[] };
  // Same rule as launch-policy.ts: Alibaba.com by platform, tag or listing host.
  const alibabaHost = `^https?://([a-z0-9-]+\\.)*alibaba\\.com(/|$)`;
  const productWhere = sql`status = 'active' AND (
    source_platform = 'alibaba'
    OR 'alibaba' = ANY(tags)
    OR coalesce(source_url, '') ~* ${alibabaHost}
    OR coalesce(specs->>'supplierListing', '') ~* ${alibabaHost}
    OR id = ANY(${pgArray(retired.products)}::uuid[])
  )`;
  try {
    const count = async (query: ReturnType<typeof sql>) =>
      ((await db.execute(query)) as { rows: { n: number }[] }).rows[0].n;
    const report = {
      products: await count(sql`SELECT count(*)::int AS n FROM products WHERE ${productWhere}`),
      ofWhichAlibaba: await count(sql`SELECT count(*)::int AS n FROM products WHERE ${productWhere} AND source_platform = 'alibaba'`),
      services: await count(sql`SELECT count(*)::int AS n FROM services WHERE status = 'active' AND id = ANY(${pgArray(retired.services)}::uuid[])`),
      vehicles: await count(sql`SELECT count(*)::int AS n FROM vehicles WHERE status = 'active' AND id = ANY(${pgArray(retired.vehicles)}::uuid[])`),
    };
    console.log("to retire:", report);
    if (DRY_RUN) {
      console.log("(dry run — nothing written)");
      return;
    }
    await db.transaction(async (tx) => {
      await tx.execute(sql`UPDATE products SET status = 'unpublished', moderation_hold = true WHERE ${productWhere}`);
      await tx.execute(
        sql`UPDATE services SET status = 'unpublished', moderation_hold = true WHERE status = 'active' AND id = ANY(${pgArray(retired.services)}::uuid[])`,
      );
      await tx.execute(sql`UPDATE vehicles SET status = 'unpublished' WHERE status = 'active' AND id = ANY(${pgArray(retired.vehicles)}::uuid[])`);
    });
    console.log("✓ retired");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? (error as Error & { cause?: Error }).cause?.message ?? error.message : error);
  process.exit(1);
});
