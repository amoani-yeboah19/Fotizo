// Backfill for the services.group column.
//
// `services.group` is NOT NULL, so `drizzle-kit push` cannot add it to a table
// that already has rows. Run this once, before the push:
//
//   DATABASE_URL=... pnpm --filter @workspace/scripts backfill-service-groups
//   pnpm --filter @workspace/db push
//
// It adds the enum and the column as nullable, maps each row's legacy free-text
// category ("Development", "Plumber") onto a taxonomy id, derives the group from
// that, and only then sets the column NOT NULL. Rows it cannot map are listed
// and left alone — the NOT NULL step is skipped so nothing is lost. Re-running
// after fixing them is safe; every step is idempotent.

import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { matchServiceCategory, SERVICE_GROUPS } from "@workspace/service-taxonomy";

const GROUP_IDS = SERVICE_GROUPS.map((g) => `'${g.id}'`).join(", ");

async function main() {
  console.log("· adding service_group enum and services.group (nullable)…");
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE service_group AS ENUM (${sql.raw(GROUP_IDS)});
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS "group" service_group`);

  const rows = await db.execute<{ id: string; category: string }>(
    sql`SELECT id, category FROM services WHERE "group" IS NULL`,
  );

  const unmapped: { id: string; category: string }[] = [];
  let updated = 0;

  for (const row of rows.rows) {
    const match = matchServiceCategory(row.category);
    if (!match) {
      unmapped.push(row);
      continue;
    }
    await db.execute(sql`
      UPDATE services
      SET category = ${match.id}, "group" = ${match.group}::service_group
      WHERE id = ${row.id}
    `);
    updated++;
  }

  console.log(`· mapped ${updated} row(s) onto the taxonomy`);

  if (unmapped.length > 0) {
    console.error(
      `\n! ${unmapped.length} row(s) have a category with no taxonomy match. ` +
        `Set their category by hand, then re-run this script:`,
    );
    for (const row of unmapped) console.error(`    ${row.id}  category=${JSON.stringify(row.category)}`);
    console.error("\n  Leaving services.group nullable until they're resolved.");
    return;
  }

  console.log("· setting services.group NOT NULL…");
  await db.execute(sql`ALTER TABLE services ALTER COLUMN "group" SET NOT NULL`);
  console.log("✓ backfill complete — `pnpm --filter @workspace/db push` is safe to run now.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
