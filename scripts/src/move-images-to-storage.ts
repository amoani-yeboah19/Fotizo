// Moves existing images into Supabase Storage and rewrites the references.
//
//   node --env-file=artifacts/api-server/.env node_modules/.bin/tsx scripts/src/move-images-to-storage.ts --dry-run
//   pnpm --filter @workspace/scripts move-images-to-storage -- [--dry-run] [--include-remote] [--workers 6]
//
// Needs DATABASE_URL, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the dry run
// needs only DATABASE_URL). By default it moves images stored inline as data
// URLs (product photos, service photos, account avatars and order snapshots).
// --include-remote also copies images hosted on other websites (seeded shop
// products and vehicles) so they no longer depend on those sites.
//
// Files are stored once per content (library/<sha256>.<ext>), so re-running is
// safe and the same photo in a product and its order snapshots becomes one file.
// Each row is only rewritten if it still holds the values that were read.
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";

const DRY_RUN = process.argv.includes("--dry-run");
const INCLUDE_REMOTE = process.argv.includes("--include-remote");
// How many rows to work on at once; lower it for slow or rate-limiting image hosts.
const WORKERS = Math.max(1, Number(process.argv[process.argv.indexOf("--workers") + 1]) || 6);
const MAX_BYTES = 5 * 1024 * 1024;

const base = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const bucket = (process.env.SUPABASE_STORAGE_BUCKET ?? "").trim() || "fotizo-images";
const publicPrefix = `${base}/storage/v1/object/public/${bucket}/`;

type ImageType = "image/jpeg" | "image/png" | "image/webp";
const EXT: Record<ImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Same checks as artifacts/api-server/src/lib/storage.ts.
function sniff(bytes: Buffer): ImageType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

const isInline = (value: string) => value.startsWith("data:image/");
const isRemote = (value: string) => /^https?:\/\//i.test(value) && !value.startsWith(publicPrefix);
const wanted = (value: string | null | undefined): value is string =>
  !!value && (isInline(value) || (INCLUDE_REMOTE && isRemote(value)));

async function readSource(value: string): Promise<Buffer> {
  if (isInline(value)) return Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
  const response = await fetch(value, { signal: AbortSignal.timeout(45_000), redirect: "follow" });
  if (!response.ok) throw new Error(`download failed (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error("larger than 5 MB");
  return bytes;
}

const headers = { Authorization: `Bearer ${key}`, apikey: key };
async function ensureBucket() {
  const response = await fetch(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: MAX_BYTES, allowed_mime_types: Object.keys(EXT) }),
  });
  if (!response.ok && !/already exists|409/i.test(await response.text()))
    throw new Error(`Could not create the ${bucket} bucket (${response.status}).`);
}

const moved = new Map<string, string>();
const failures: { source: string; reason: string }[] = [];

/** The storage URL for an image, uploading it the first time it's seen. */
async function store(value: string) {
  const cached = moved.get(value);
  if (cached) return cached;
  const bytes = await readSource(value);
  const type = sniff(bytes);
  if (!type || !bytes.length || bytes.length > MAX_BYTES) throw new Error("not a JPEG, PNG or WebP under 5 MB");
  const path = `library/${createHash("sha256").update(bytes).digest("hex")}.${EXT[type]}`;
  const response = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": type, "Cache-Control": "31536000", "x-upsert": "true" },
    body: new Uint8Array(bytes),
  });
  if (!response.ok) throw new Error(`upload failed (${response.status})`);
  const url = `${publicPrefix}${path}`;
  moved.set(value, url);
  return url;
}

/** Replacement for a value, or the value itself when it can't be moved. */
async function replacement(value: string) {
  if (!wanted(value)) return value;
  try {
    return await store(value);
  } catch (error) {
    failures.push({ source: value.slice(0, 80), reason: error instanceof Error ? error.message : String(error) });
    return value;
  }
}

// Drizzle expands JS arrays into parameter lists, so arrays travel as JSON.
const textArray = (values: string[]) =>
  sql`ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(values)}::jsonb))`;

const describe = (value: string) => (isInline(value) ? "inline" : "remote");

// The underlying database/network message (Drizzle wraps it as "Failed query").
const reason = (error: unknown) => {
  const e = error as { message?: string; cause?: { message?: string } };
  return e?.cause?.message ?? e?.message ?? String(error);
};

/** Retries brief connection problems before giving up on a row. */
async function withRetry<T>(work: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/** Runs `work` for each item, a few at a time. */
async function inParallel<T>(items: T[], work: (item: T) => Promise<void>, workers = WORKERS) {
  let next = 0;
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (next < items.length) await work(items[next++]);
    }),
  );
}

type Rows<T> = { rows: T[] };
async function main() {
  if (!DRY_RUN && (!base || !key)) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use --dry-run.");
  try {
    const read = <T>(query: ReturnType<typeof sql>) => withRetry(() => db.execute(query)) as Promise<Rows<T>>;
    const products = await read<{ id: string; images: string[] }>(sql`SELECT id, images FROM products`);
    const services = await read<{ id: string; avatar: string }>(sql`SELECT id, avatar FROM services`);
    const users = await read<{ id: string; avatar: string }>(sql`SELECT id, avatar FROM users WHERE avatar IS NOT NULL`);
    const lines = await read<{ id: string; product_image: string }>(sql`SELECT id, product_image FROM order_items`);
    const vehicles = INCLUDE_REMOTE
      ? await read<{ id: string; images: string[] }>(sql`SELECT id, images FROM vehicles`)
      : { rows: [] };

    const tally: Record<string, Record<string, number>> = {};
    const count = (table: string, values: (string | null)[]) => {
      for (const v of values.filter(wanted)) {
        tally[table] ??= {};
        tally[table][describe(v)] = (tally[table][describe(v)] ?? 0) + 1;
      }
    };
    count("products", products.rows.flatMap((r) => r.images));
    count("services", services.rows.map((r) => r.avatar));
    count("users", users.rows.map((r) => r.avatar));
    count("order_items", lines.rows.map((r) => r.product_image));
    count("vehicles", vehicles.rows.flatMap((r) => r.images));
    console.log(INCLUDE_REMOTE ? "Images to move (inline and remote):" : "Inline images to move:", tally);
    if (DRY_RUN) return;

    await ensureBucket();
    let updated = 0;
    let done = 0;
    const rowFailures: string[] = [];
    // A row that still fails after retries is reported and skipped; re-running picks it up.
    const save = async (label: string, query: ReturnType<typeof sql>) => {
      try {
        const result = (await withRetry(() => db.execute(query))) as { rowCount?: number | null };
        updated += result.rowCount ?? 0;
      } catch (error) {
        rowFailures.push(`${label}: ${reason(error)}`);
      }
      if (++done % 100 === 0) console.log(`… ${done} rows processed`);
    };
    const arrays = async (table: "products" | "vehicles", rows: { id: string; images: string[] }[]) =>
      inParallel(
        rows.filter((row) => row.images.some(wanted)),
        async (row) => {
          const next = await Promise.all(row.images.map(replacement));
          if (next.every((value, i) => value === row.images[i])) return;
          await save(
            `${table} ${row.id}`,
            sql`UPDATE ${sql.identifier(table)} SET images = ${textArray(next)} WHERE id = ${row.id} AND images = ${textArray(row.images)}`,
          );
        },
      );
    await arrays("products", products.rows);
    await arrays("vehicles", vehicles.rows);
    const single = async (table: "services" | "users" | "order_items", column: "avatar" | "product_image", rows: { id: string; value: string }[]) =>
      inParallel(
        rows.filter((row) => wanted(row.value)),
        async (row) => {
          const next = await replacement(row.value);
          if (next === row.value) return;
          await save(
            `${table} ${row.id}`,
            sql`UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = ${next} WHERE id = ${row.id} AND ${sql.identifier(column)} = ${row.value}`,
          );
        },
      );
    await single("services", "avatar", services.rows.map((r) => ({ id: r.id, value: r.avatar })));
    await single("users", "avatar", users.rows.map((r) => ({ id: r.id, value: r.avatar })));
    await single("order_items", "product_image", lines.rows.map((r) => ({ id: r.id, value: r.product_image })));

    console.log(`Stored ${moved.size} distinct images and updated ${updated} rows.`);
    if (failures.length) {
      console.log(`${failures.length} images were left unchanged:`);
      for (const f of failures.slice(0, 50)) console.log(`  ${f.source}… — ${f.reason}`);
    }
    if (rowFailures.length) {
      console.log(`${rowFailures.length} rows could not be updated (run again to retry):`);
      for (const f of rowFailures.slice(0, 50)) console.log(`  ${f}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(reason(error));
  process.exit(1);
});
