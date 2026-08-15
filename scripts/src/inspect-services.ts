// Read-only pre-migration snapshot of the services table.
//
// Run before backfill-service-groups so there is a record of every row's
// original free-text category — the backfill rewrites that column, and this is
// the cheapest way to be able to answer "what was it before?" afterwards.
//
//   DATABASE_URL=... pnpm --filter @workspace/scripts inspect-services

import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { matchServiceCategory } from "@workspace/service-taxonomy";

async function main() {
  const cols = await db.execute<{ column_name: string }>(
    sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'services'`,
  );
  const names = cols.rows.map((r) => r.column_name);
  console.log(`services columns: ${names.join(", ")}`);
  console.log(`has "group" column: ${names.includes("group") ? "YES" : "NO"}\n`);

  const rows = await db.execute<{
    id: string;
    title: string;
    category: string;
    status: string;
    provider_id: string;
  }>(sql`SELECT id, title, category, status, provider_id FROM services ORDER BY created_at`);

  console.log(`${rows.rows.length} service row(s):\n`);
  for (const r of rows.rows) {
    const match = matchServiceCategory(r.category);
    const verdict = match ? `→ ${match.id} (${match.group})` : "→ NO TAXONOMY MATCH";
    console.log(`  ${r.id}`);
    console.log(`    title:    ${r.title}`);
    console.log(`    category: ${JSON.stringify(r.category)}  ${verdict}`);
    console.log(`    status:   ${r.status}`);
  }

  const unmapped = rows.rows.filter((r) => !matchServiceCategory(r.category));
  console.log(
    `\nsummary: ${rows.rows.length - unmapped.length} mappable, ${unmapped.length} unmapped`,
  );
  if (unmapped.length > 0) {
    console.log("unmapped categories:", [...new Set(unmapped.map((r) => r.category))]);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
