// Imports a reviewed vehicle catalogue (JSON array) into the vehicles table.
//
//   pnpm --filter @workspace/scripts import-vehicles -- --file data/vehicles.candidate.json --dry-run
//   pnpm --filter @workspace/scripts import-vehicles -- --file <reviewed.json> [--publish]
//
// DATABASE_URL must be set (for example with node --env-file). Rows are upserted
// by slug, so rerunning updates vehicles in place. Without --publish every row
// lands (or stays) unpublished: prices and photos must be reviewed before the
// public autos page shows them. Staff publish vehicles from the dashboard.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";

const PUBLISH = process.argv.includes("--publish");
const DRY_RUN = process.argv.includes("--dry-run");
const fileArg = process.argv[process.argv.indexOf("--file") + 1];
if (!process.argv.includes("--file") || !fileArg)
  throw new Error("Pass --file <path to vehicles JSON>.");

const BODY_TYPES = ["suv", "coupe-suv", "sedan", "pickup"];
const FUELS = ["petrol", "hybrid", "electric"];

interface VehicleInput {
  slug: string;
  make: string;
  model: string;
  bodyType: string;
  fuel: string;
  seats: number;
  transmission: string;
  drivetrain: string;
  powertrain: string;
  efficiency: string;
  landedPrice: number;
  leadTimeWeeks: [number, number];
  images: string[];
  highlights: string[];
  description: string;
}

function validate(v: VehicleInput, index: number): VehicleInput {
  const fail = (field: string) => {
    throw new Error(`Vehicle ${index} (${v?.slug ?? "no slug"}): invalid ${field}.`);
  };
  if (typeof v.slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug)) fail("slug");
  for (const field of ["make", "model", "transmission", "drivetrain", "powertrain", "efficiency", "description"] as const)
    if (typeof v[field] !== "string" || !v[field].trim()) fail(field);
  if (!BODY_TYPES.includes(v.bodyType)) fail("bodyType");
  if (!FUELS.includes(v.fuel)) fail("fuel");
  if (!Number.isInteger(v.seats) || v.seats < 1 || v.seats > 60) fail("seats");
  if (!(v.landedPrice > 0) || !Number.isFinite(v.landedPrice)) fail("landedPrice");
  const [min, max] = v.leadTimeWeeks ?? [];
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) fail("leadTimeWeeks");
  if (!Array.isArray(v.images) || !v.images.length || v.images.some((u) => !/^https:\/\//.test(u))) fail("images");
  if (!Array.isArray(v.highlights) || v.highlights.some((h) => typeof h !== "string")) fail("highlights");
  return v;
}

async function main() {
  const path = resolve(process.cwd(), fileArg);
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("The file must contain a JSON array.");
  const vehicles = parsed.map((v, i) => validate(v as VehicleInput, i));
  const slugs = new Set(vehicles.map((v) => v.slug));
  if (slugs.size !== vehicles.length) throw new Error("Slugs must be unique.");
  const status = PUBLISH ? "active" : "unpublished";
  console.log(`${vehicles.length} valid vehicles from ${path}; status on write: ${status}.`);
  if (DRY_RUN) return;

  const { db, pool } = await import("@workspace/db");
  try {
    await db.transaction(async (tx) => {
      for (const v of vehicles) {
        await tx.execute(sql`
          INSERT INTO vehicles (slug, make, model, body_type, fuel, seats, transmission, drivetrain, powertrain,
            efficiency, landed_price, lead_time_min_weeks, lead_time_max_weeks, images, highlights, description, status)
          VALUES (${v.slug}, ${v.make}, ${v.model}, ${v.bodyType}, ${v.fuel}, ${v.seats}, ${v.transmission},
            ${v.drivetrain}, ${v.powertrain}, ${v.efficiency}, ${v.landedPrice}, ${v.leadTimeWeeks[0]},
            ${v.leadTimeWeeks[1]}, ${v.images}, ${v.highlights}, ${v.description}, ${status})
          ON CONFLICT (slug) DO UPDATE SET make = EXCLUDED.make, model = EXCLUDED.model,
            body_type = EXCLUDED.body_type, fuel = EXCLUDED.fuel, seats = EXCLUDED.seats,
            transmission = EXCLUDED.transmission, drivetrain = EXCLUDED.drivetrain,
            powertrain = EXCLUDED.powertrain, efficiency = EXCLUDED.efficiency,
            landed_price = EXCLUDED.landed_price, lead_time_min_weeks = EXCLUDED.lead_time_min_weeks,
            lead_time_max_weeks = EXCLUDED.lead_time_max_weeks, images = EXCLUDED.images,
            highlights = EXCLUDED.highlights, description = EXCLUDED.description,
            status = ${PUBLISH ? sql`'active'` : sql`vehicles.status`}, updated_at = now()`);
      }
    });
    console.log(`Imported ${vehicles.length} vehicles.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
