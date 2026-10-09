// Imports the storefront's 1688 batches (clothing, more, home, departments,
// shoes, family and the detailed listings) into the Fotizo Shop with
// server-calculated prices.
//
//   pnpm exec tsx --env-file=<api .env> src/import-1688-catalogue.ts --dry-run
//   pnpm exec tsx --env-file=<api .env> src/import-1688-catalogue.ts [--publish]
//
// Each batch's storefront file (1688-*-products.json) decides which offers are
// listed and supplies the English title, description, category and local
// images; its handoff (docs/sourcing/1688-*/products.json) supplies the supplier
// cost, link and capture details. Offers a batch holds back are not in its
// storefront file, so they are skipped. An offer in several batches is imported
// once, from the first batch in BATCHES (the storefront's own precedence).
//
// Price = supplier CNY cost x 1.30 / CNY per GBP (CHINESE_GOODS in
// @workspace/db), from the unrounded cost, at today's rate (falling back to the
// verified rate in the batch's pricing file). The markup is applied once; the
// handoff's own GBP estimate is not reused. Shipping is quoted separately, and
// every order is confirmed with the supplier before the buyer pays.
//
// Rows are matched by Fotizo ID (uuid of "1688-<offer id>", so storefront links
// keep working), then by (platform, offer id). Existing rows keep their ID,
// images, status and stock; re-running only refreshes copy and prices. Supplier
// links are stored privately in source_url, not in the public specs.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { sql } from "drizzle-orm";

const DRY_RUN = process.argv.includes("--dry-run");
const PUBLISH = process.argv.includes("--publish");
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const SHOP = resolve(ROOT, "artifacts/fotizo/src/features/shop/data");
const SOURCING = resolve(ROOT, "docs/sourcing");
// Storefront file, pricing file and handoff folder, in the storefront's order
// (features/shop/data/sourced-catalogue.ts).
const BATCHES = [
  { storefront: "1688-family-products.json", pricing: "1688-family-pricing.json", handoff: "1688-family-2026-10-08" },
  { storefront: "1688-departments-products.json", pricing: "1688-departments-pricing.json", handoff: "1688-departments-2026-10-07" },
  { storefront: "1688-shoes-products.json", pricing: "1688-shoes-pricing.json", handoff: "1688-shoes-2026-10-07" },
  { storefront: "1688-detail-products.json", pricing: "1688-pricing.json", handoff: "1688-clothing-2026-10-04" },
  { storefront: "1688-more-products.json", pricing: "1688-more-pricing.json", handoff: "1688-more-2026-10-05" },
  { storefront: "1688-home-products.json", pricing: "1688-home-pricing.json", handoff: "1688-home-2026-10-05" },
  { storefront: "1688-products.json", pricing: "1688-pricing.json", handoff: "1688-clothing-2026-10-04" },
];
const RATES_URL = process.env.CURRENCY_RATES_URL ?? "https://open.er-api.com/v6/latest/GBP";
const CHINA_REP_EMAIL = "china@fotizo.com";

interface StorefrontRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  images: string[];
}
interface HandoffRecord {
  platform: string;
  productId: string;
  supplierCurrency: string;
  supplierPrice: string | null;
  supplierUnit: string | null;
  minimumOrder: string | null;
  sourceUrl: string;
  capturedAt: string;
}

/** A Postgres array literal (drizzle would expand a JS array into separate parameters). */
const pgArray = (ids: string[]) => `{${ids.join(",")}}`;
/**
 * A fully detailed listing (<offer>-details.json beside the handoff) for offers
 * captured individually: its cost is the lowest variant's supplier price.
 */
function detailedRecord(handoff: string, offerId: string): HandoffRecord | undefined {
  const path = resolve(SOURCING, handoff, `${offerId}-details.json`);
  if (!existsSync(path)) return undefined;
  const d = read<{
    platform: string;
    productId: string;
    sourceUrl: string;
    importedAt: string;
    variants?: { supplierPriceCny?: string }[];
  }>(path);
  const prices = (d.variants ?? []).map((v) => Number(v.supplierPriceCny)).filter((n) => n > 0);
  return {
    platform: d.platform,
    productId: d.productId,
    supplierCurrency: "CNY",
    supplierPrice: prices.length ? String(Math.min(...prices)) : null,
    supplierUnit: null,
    minimumOrder: null,
    sourceUrl: d.sourceUrl,
    capturedAt: d.importedAt,
  };
}

const read = <T>(path: string) => JSON.parse(readFileSync(path, "utf8")) as T;

function readCategories(): Map<string, string> {
  const src = readFileSync(resolve(SHOP, "categories.ts"), "utf8");
  const out = new Map<string, string>();
  for (const m of src.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*icon:\s*\w+\s*\}/g)) out.set(m[1], m[2]);
  if (!out.size) throw new Error("No shop categories found — did categories.ts move?");
  return out;
}

async function liveCnyPerGbp(): Promise<number | null> {
  try {
    const response = await fetch(RATES_URL, { signal: AbortSignal.timeout(10_000) });
    const rate = ((await response.json()) as { rates?: Record<string, number> }).rates?.CNY;
    return rate && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

async function main() {
  const { db, pool, productsTable, usersTable, CHINESE_GOODS, sourcedPriceGbp, catalogueUuid } = await import("@workspace/db");
  if (!(CHINESE_GOODS.platforms as readonly string[]).includes("1688"))
    throw new Error("1688 is not in CHINESE_GOODS.platforms — apply the backend update first.");
  try {
    const categories = readCategories();
    // Every listed offer with its own batch's supplier record.
    const handoffs = new Map<string, Map<string, HandoffRecord>>();
    const storefront: (StorefrontRecord & { handoff: string })[] = [];
    for (const batch of BATCHES) {
      if (!handoffs.has(batch.handoff))
        handoffs.set(
          batch.handoff,
          new Map(read<HandoffRecord[]>(resolve(SOURCING, batch.handoff, "products.json")).map((r) => [r.productId, r])),
        );
      for (const p of read<StorefrontRecord[]>(resolve(SHOP, batch.storefront))) storefront.push({ ...p, handoff: batch.handoff });
    }
    // The most recently verified batch rate, used only if today's is unavailable.
    const recorded = BATCHES.map((b) => read<{ cnyPerGbp: number; rateDate: string }>(resolve(SHOP, b.pricing)))[0];
    const live = await liveCnyPerGbp();
    const rate = live ?? recorded.cnyPerGbp;
    const pricedAt = new Date();

    const [rep] = await db.select({ id: usersTable.id }).from(usersTable).where(sql`${usersTable.email} = ${CHINA_REP_EMAIL}`);
    if (!rep) throw new Error(`${CHINA_REP_EMAIL} must exist (run seed-shop-catalogue once) before importing.`);

    const existing = (await db.execute(
      sql`SELECT id, price, specs FROM products WHERE source_platform = '1688' OR id = ANY(${pgArray(storefront.map((p) => catalogueUuid(p.id)))}::uuid[])`,
    )) as { rows: { id: string; price: string; specs: Record<string, string> }[] };
    const byId = new Map(existing.rows.map((r) => [r.id, r]));
    const bySource = new Map(existing.rows.filter((r) => r.specs?.shopId).map((r) => [r.specs.shopId, r]));

    const report = { listed: storefront.length, added: 0, updated: 0, duplicates: 0, noHandoffRecord: 0, unknownCategory: 0, unpriced: 0, priceChanges: 0 };
    const rejected: { id: string; reason: string }[] = [];
    const seen = new Set<string>();
    const writes: (() => Promise<unknown>)[] = [];

    for (const p of storefront) {
      const offerId = p.id.replace(/^1688-/, "");
      if (seen.has(offerId)) {
        report.duplicates++;
        continue;
      }
      seen.add(offerId);
      const source = handoffs.get(p.handoff)?.get(offerId) ?? detailedRecord(p.handoff, offerId);
      if (!source || source.platform !== "1688") {
        report.noHandoffRecord++;
        rejected.push({ id: p.id, reason: "not in the handoff" });
        continue;
      }
      const category = categories.get(p.category);
      if (!category) {
        report.unknownCategory++;
        rejected.push({ id: p.id, reason: `unknown category ${p.category}` });
        continue;
      }
      const cost = Number(source.supplierPrice);
      if (!(cost > 0) || source.supplierCurrency !== "CNY") {
        report.unpriced++;
        rejected.push({ id: p.id, reason: "no CNY supplier price" });
        continue;
      }
      const price = sourcedPriceGbp(cost, rate);
      const specs: Record<string, string> = {
        shopId: p.id,
        department: p.category,
        unitsSold: "0",
        priceRange: `CNY ${source.supplierPrice}`,
        capturedAt: source.capturedAt,
        ...(source.minimumOrder ? { minimumOrder: source.minimumOrder } : {}),
        ...(source.supplierUnit ? { unit: source.supplierUnit } : {}),
      };
      const fields = {
        title: p.title,
        description: p.description,
        category,
        price,
        originalPrice: null,
        sourcePlatform: "1688",
        sourceProductId: offerId,
        sourceUrl: source.sourceUrl,
        supplierCurrency: "CNY",
        supplierCost: cost,
        supplierRate: rate,
        markupPercent: CHINESE_GOODS.markupPercent,
        priceBasis: "quoted" as const,
        pricedAt,
      };
      const id = catalogueUuid(p.id);
      const match = byId.get(id) ?? bySource.get(p.id);
      if (match) {
        report.updated++;
        if (Math.abs(Number(match.price) - price) >= 0.01) report.priceChanges++;
        writes.push(() =>
          db.update(productsTable).set({ ...fields, specs: { ...match.specs, ...specs } }).where(sql`${productsTable.id} = ${match.id}`),
        );
      } else {
        report.added++;
        writes.push(() =>
          db.insert(productsTable).values({
            id,
            ...fields,
            rating: 0,
            reviewCount: 0,
            sellerId: rep.id,
            channel: "shop",
            images: [...new Set([p.image, ...(p.images ?? [])])].filter(Boolean),
            stockCount: 0,
            tags: ["imported", "1688"],
            specs,
            status: PUBLISH ? "active" : "unpublished",
          }),
        );
      }
    }

    console.log(`CNY per GBP:      ${rate}${live ? " (live)" : ` (verified ${recorded.rateDate}; rate service unavailable)`}`);
    console.log(report);
    if (rejected.length) console.log("rejected:", rejected.slice(0, 20), rejected.length > 20 ? `… and ${rejected.length - 20} more` : "");
    if (DRY_RUN) {
      console.log("(dry run — nothing written)");
      return;
    }
    for (const label of new Set(storefront.map((p) => categories.get(p.category)).filter(Boolean)))
      await db.execute(sql`INSERT INTO categories (name, icon) VALUES (${label}, 'Package') ON CONFLICT (name) DO NOTHING`);
    // A few writes at a time; rows are independent, so a re-run resumes.
    let done = 0;
    let next = 0;
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (next < writes.length) {
          await writes[next++]();
          if (++done % 500 === 0) console.log(`… ${done}/${writes.length}`);
        }
      }),
    );
    console.log(`✓ wrote ${writes.length} products (${report.added} new as ${PUBLISH ? "active" : "unpublished"}, ${report.updated} updated).`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? (error as Error & { cause?: Error }).cause?.message ?? error.message : error);
  process.exit(1);
});
