import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import pg from "pg";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(736291004)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS fotizo_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const folder = new URL("./migrations/", import.meta.url);
  for (const name of (await readdir(folder))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(new URL(name, folder), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query(
      "SELECT checksum FROM fotizo_migrations WHERE name = $1",
      [name],
    );
    if (existing.rows.length) {
      if (existing.rows[0].checksum !== checksum)
        throw new Error(`Applied migration changed: ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query(
      "INSERT INTO fotizo_migrations(name, checksum) VALUES ($1, $2)",
      [name, checksum],
    );
    console.log(`Applied ${name}`);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
