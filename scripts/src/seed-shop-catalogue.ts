// Seeds the Fotizo Shop catalogue into the database, owned by the China
// representative.
//
//   DATABASE_URL=... CHINA_REP_PASSWORD=... \
//     pnpm --filter @workspace/scripts seed-shop-catalogue
//
// Add --publish to list them on the public shop immediately. WITHOUT that flag
// every product lands as "unpublished", which is the intended default: the
// prices in the catalogue come from a placeholder 2.2x markup (see
// artifacts/fotizo/tools/import-alibaba.mjs), and shop cards are add-to-cart,
// so publishing before the real pricing lands would let customers buy at
// invented prices. Public reads filter on status = 'active', while
// GET /seller/products filters only by owner — so unpublished rows are hidden
// from shoppers but still visible in the rep's dashboard.
//
// Every step is idempotent. Product ids are derived from the catalogue's own
// string id (uuidv5), so re-running after a re-import updates rows in place
// rather than creating duplicates.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

// @workspace/db opens a connection pool the moment it is imported and throws if
// DATABASE_URL is unset, so it is loaded inside main() — that keeps --dry-run
// usable with no database configured at all.
type DbModule = typeof import("@workspace/db");
let closePool: (() => Promise<void>) | null = null;

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOP = resolve(HERE, "../../artifacts/fotizo/src/features/shop/data");

const PUBLISH = process.argv.includes("--publish");
// --dry-run parses the catalogue and reports exactly what would be written
// without opening a connection. Worth running before pointing this at
// production, since the alternative is finding out mid-write.
const DRY_RUN = process.argv.includes("--dry-run");

const CHINA_REP = {
  name: "Wei Zhang",
  email: "china@fotizo.com",
  role: "china_representative" as const,
};

// Matches the mock account in services/mocks/fixtures.ts so the demo build and
// the real database describe the same person.
const SALT_ROUNDS = 12;

interface ShopProduct {
  id: string;
  title: string;
  category: string;
  price: number;
  originalPrice: number;
  rating: number;
  sold: number;
  image: string;
  images: string[];
  freeShipping: boolean;
  almostGone: boolean;
  description: string;
  sourceUrl?: string;
}

/**
 * The catalogue is a TS module that imports lucide icons, so it cannot simply
 * be imported from here — that would drag React tooling into a DB script. Both
 * files are our own committed source, so the array is lifted out textually:
 * the categories by regex (id/label only, never touching the icon binding) and
 * the products by evaluating the array literal on its own.
 */
function readCategories(): { id: string; label: string }[] {
  const src = readFileSync(resolve(SHOP, "categories.ts"), "utf8");
  const out: { id: string; label: string }[] = [];
  const re = /\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*icon:\s*\w+\s*\}/g;
  for (const m of src.matchAll(re)) out.push({ id: m[1], label: m[2] });
  if (out.length === 0) throw new Error("No shop categories found — did categories.ts move?");
  return out;
}

function readProducts(): ShopProduct[] {
  const src = readFileSync(resolve(SHOP, "products.ts"), "utf8");
  const m = src.match(/export const SHOP_PRODUCTS: ShopProduct\[\] = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error("Could not locate SHOP_PRODUCTS — did products.ts change shape?");
  const products = new Function(`return ${m[1]}`)() as ShopProduct[];
  if (!Array.isArray(products) || products.length === 0) throw new Error("SHOP_PRODUCTS is empty.");
  return products;
}

/** RFC 4122 v5 (SHA-1, name-based) so a catalogue id always maps to one row. */
const NAMESPACE = "6f9d1c1e-6f27-4f3a-9a2f-1d7b0c5a8e42";
function uuidv5(name: string): string {
  const nsBytes = Buffer.from(NAMESPACE.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(nsBytes).update(Buffer.from(name, "utf8")).digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function main() {
  const password = process.env.CHINA_REP_PASSWORD;

  if (DRY_RUN) {
    const categories = readCategories();
    const products = readProducts();
    const labelOf = new Map(categories.map((c) => [c.id, c.label]));
    const byDept = new Map<string, number>();
    const unknown = new Set<string>();
    for (const p of products) {
      if (!labelOf.has(p.category)) unknown.add(p.category);
      byDept.set(p.category, (byDept.get(p.category) ?? 0) + 1);
    }
    console.log(`departments: ${categories.length}`);
    console.log(`products:    ${products.length}`);
    console.log(`status:      ${PUBLISH ? "active" : "unpublished"}`);
    console.log(`owner:       ${CHINA_REP.email} (${CHINA_REP.role})`);
    console.log("\nper department:");
    for (const [dept, n] of [...byDept].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${(labelOf.get(dept) ?? dept + " (UNKNOWN)").padEnd(22)} ${String(n).padStart(3)}`);
    }
    const sample = products[0];
    console.log(`\nsample id mapping: ${sample.id} -> ${uuidv5(sample.id)}`);
    if (unknown.size > 0) console.error(`\n! unknown departments: ${[...unknown].join(", ")}`);
    console.log("\n(dry run — nothing written)");
    return;
  }

  const { db, pool, usersTable, productsTable, categoriesTable }: DbModule =
    await import("@workspace/db");
  closePool = () => pool.end();

  // ── 1. Roles ──────────────────────────────────────────────────────────────
  // The user_role enum predates both representative roles. ADD VALUE cannot run
  // inside a transaction, so these go one at a time before anything else.
  console.log("· adding representative roles to the user_role enum…");
  for (const role of ["representative", "china_representative"]) {
    await db.execute(sql.raw(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${role}'`));
  }

  // ── 2. Departments ────────────────────────────────────────────────────────
  const categories = readCategories();
  console.log(`· seeding ${categories.length} shop departments…`);
  let newCats = 0;
  for (const cat of categories) {
    const res = await db
      .insert(categoriesTable)
      // The shop's own icon binding is a lucide component, not a name we can
      // store, so departments get a neutral icon; the marketplace's existing
      // rows keep theirs.
      .values({ name: cat.label, icon: "Package" })
      .onConflictDoNothing({ target: categoriesTable.name })
      .returning({ id: categoriesTable.id });
    if (res.length > 0) newCats++;
  }
  console.log(`  ${newCats} added, ${categories.length - newCats} already present`);

  // ── 3. The sourcing account ───────────────────────────────────────────────
  const existing = await db.query.usersTable.findFirst({
    where: (u, { eq }) => eq(u.email, CHINA_REP.email),
  });

  let sellerId: string;
  if (existing) {
    sellerId = existing.id;
    console.log(`· ${CHINA_REP.email} already exists (${existing.role})`);
    if (existing.role !== CHINA_REP.role) {
      await db
        .update(usersTable)
        .set({ role: CHINA_REP.role })
        .where(sql`${usersTable.id} = ${existing.id}`);
      console.log(`  role corrected to ${CHINA_REP.role}`);
    }
    if (password) {
      await db
        .update(usersTable)
        .set({ passwordHash: await bcrypt.hash(password, SALT_ROUNDS) })
        .where(sql`${usersTable.id} = ${existing.id}`);
      console.log("  password updated from CHINA_REP_PASSWORD");
    }
  } else {
    if (!password) {
      throw new Error(
        `${CHINA_REP.email} does not exist yet. Set CHINA_REP_PASSWORD so the ` +
          `account can be created with a password it can sign in with.`,
      );
    }
    const [created] = await db
      .insert(usersTable)
      .values({
        name: CHINA_REP.name,
        email: CHINA_REP.email,
        passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
        role: CHINA_REP.role,
        verified: true,
      })
      .returning({ id: usersTable.id });
    sellerId = created.id;
    console.log(`· created ${CHINA_REP.email} as ${CHINA_REP.role}`);
  }

  // ── 4. The catalogue ──────────────────────────────────────────────────────
  const products = readProducts();
  const labelOf = new Map(categories.map((c) => [c.id, c.label]));
  const status = PUBLISH ? ("active" as const) : ("unpublished" as const);
  console.log(`· upserting ${products.length} products as "${status}"…`);

  let written = 0;
  const unknownDepartments = new Set<string>();

  for (const p of products) {
    const label = labelOf.get(p.category);
    if (!label) {
      unknownDepartments.add(p.category);
      continue;
    }

    // Cover first, then the gallery, with duplicates dropped.
    const images = [...new Set([p.image, ...(p.images ?? [])])].filter(Boolean);

    // The catalogue sets originalPrice === price to mean "no discount"; the
    // column uses NULL for that, so discountPct() stays honest either way.
    const originalPrice = p.originalPrice > p.price ? p.originalPrice : null;

    // Fields the shop has and the products table does not. specs is
    // Record<string,string>, so everything is stored as text.
    const specs: Record<string, string> = {
      shopId: p.id,
      department: p.category,
      unitsSold: String(p.sold ?? 0),
      freeShipping: String(Boolean(p.freeShipping)),
      almostGone: String(Boolean(p.almostGone)),
    };
    if (p.sourceUrl) specs.supplierListing = p.sourceUrl;

    const tags = ["imported", p.id.startsWith("ali-") ? "alibaba" : "supplier"];
    if (p.freeShipping) tags.push("free-shipping");

    const row = {
      id: uuidv5(p.id),
      title: p.title,
      description: p.description,
      price: p.price,
      originalPrice,
      rating: p.rating ?? 0,
      reviewCount: 0,
      sellerId,
      category: label,
      images,
      // Nothing is physically held — these are imported to order — so stock
      // stays 0 until real inventory is known. Publishing with 0 shows the
      // listing as out of stock rather than pretending to have units.
      stockCount: 0,
      tags,
      specs,
      status,
    };

    await db
      .insert(productsTable)
      .values(row)
      .onConflictDoUpdate({ target: productsTable.id, set: { ...row, id: undefined } });
    written++;
  }

  console.log(`  ${written} written`);
  if (unknownDepartments.size > 0) {
    console.error(
      `\n! skipped products in ${unknownDepartments.size} unknown department(s): ` +
        [...unknownDepartments].join(", "),
    );
  }

  console.log(
    `\n✓ done. ${written} products owned by ${CHINA_REP.email}, status "${status}".` +
      (PUBLISH
        ? ""
        : "\n  They are hidden from the public shop and visible in the rep's dashboard." +
          "\n  Re-run with --publish once real pricing is set."),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool?.());
