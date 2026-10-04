// Imports the frontend's Fotizo Shop catalogue (taobao-products.json,
// alibaba-products.json and the remaining records in products.ts) into the
// database with server-calculated prices. Taobao records the manifest marks as
// services, digital goods or deposits (anything but "product") are skipped.
//
//   pnpm --filter @workspace/scripts import-shop-catalogue -- --dry-run
//   pnpm --filter @workspace/scripts import-shop-catalogue -- [--publish]
//
// Needs DATABASE_URL. Pricing for Alibaba, Taobao and Pinduoduo goods is the
// supplier cost x 1.30 (see FEE_SCHEDULE/CHINESE_GOODS in @workspace/db), from
// the lowest quoted supplier price, converted to GBP at today's rate (recorded
// with the product; the catalogue's own estimate — 1.27 USD/GBP, or the
// recorded CNY rate for Taobao — is used if the rate service can't be reached). Older listings without a raw quote keep their
// price, recorded as a cost recovered from it. Shipping is priced separately.
//
// Products are matched to existing rows by their Fotizo ID, then by platform +
// supplier product ID, so nothing is duplicated. Existing rows keep their ID,
// images (which may already be in Fotizo's storage), status and stock; new
// rows are added unpublished unless --publish. Stock quantities are not shown
// to customers and stay at 0 for these sourced-to-order goods.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { sql } from "drizzle-orm";

const DRY_RUN = process.argv.includes("--dry-run");
const PUBLISH = process.argv.includes("--publish");
const HERE = dirname(fileURLToPath(import.meta.url));
const SHOP = resolve(HERE, "../../artifacts/fotizo/src/features/shop/data");
const RATES_URL = process.env.CURRENCY_RATES_URL ?? "https://open.er-api.com/v6/latest/GBP";
const CATALOGUE_USD_PER_GBP = 1.27;
const CHINA_REP_EMAIL = "china@fotizo.com";

interface CatalogueProduct {
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
  sourcing?: {
    platform: string;
    productId: string;
    currency: string;
    priceRange: string;
    capturedAt: string;
    minimumOrder?: string | null;
    unit?: string | null;
    usdPerGbp?: number;
    /** GBP per supplier-currency unit (Taobao's recorded CNY rate). */
    sourceToGbp?: number;
  };
}

type Source = {
  platform: "alibaba" | "taobao" | "pinduoduo" | "tuwa";
  productId: string;
  url: string | null;
};

function readCategories(): Map<string, string> {
  const src = readFileSync(resolve(SHOP, "categories.ts"), "utf8");
  const out = new Map<string, string>();
  for (const m of src.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*icon:\s*\w+\s*\}/g)) out.set(m[1], m[2]);
  if (!out.size) throw new Error("No shop categories found — did categories.ts move?");
  return out;
}

/** Taobao records that aren't physical products (services, digital goods, deposits). */
function heldTaobaoIds(): Set<string> {
  const manifest = JSON.parse(readFileSync(resolve(SHOP, "taobao-import-manifest.json"), "utf8")) as {
    productId: string;
    kind: string;
  }[];
  return new Set(manifest.filter((r) => r.kind !== "product").map((r) => r.productId));
}

/** The frontend's catalogue: the JSON imports first, then remaining inline records. */
function readCatalogue(): CatalogueProduct[] {
  const read = (file: string) => JSON.parse(readFileSync(resolve(SHOP, file), "utf8")) as CatalogueProduct[];
  const json = [...read("taobao-products.json"), ...read("alibaba-products.json")];
  const src = readFileSync(resolve(SHOP, "products.ts"), "utf8");
  const m = src.match(/const EXISTING_SHOP_PRODUCTS: ShopProduct\[\] = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error("Could not locate EXISTING_SHOP_PRODUCTS — did products.ts change shape?");
  const inline = new Function(`return ${m[1]}`)() as CatalogueProduct[];
  return [...json, ...inline];
}

const PLATFORM_HOSTS: [RegExp, Source["platform"]][] = [
  [/alibaba\.com/i, "alibaba"],
  [/taobao\.com|tmall\.com/i, "taobao"],
  [/pinduoduo\.com|yangkeduo\.com|temu\.com/i, "pinduoduo"],
];

function sourceOf(p: CatalogueProduct): Source {
  if (p.sourcing?.platform && p.sourcing.productId)
    return { platform: p.sourcing.platform as Source["platform"], productId: p.sourcing.productId, url: p.sourceUrl ?? null };
  const url = p.sourceUrl ?? null;
  const platform = url ? PLATFORM_HOSTS.find(([re]) => re.test(url))?.[1] : undefined;
  const productId = url?.match(/_(\d+)\.html/)?.[1] ?? url?.match(/[?&]id=(\d+)/)?.[1];
  if (platform && productId) return { platform, productId, url };
  // Older listings from the Ghanaian supplier storefront, keyed by their catalogue id.
  return { platform: "tuwa", productId: p.id, url };
}

/** Lowest price in a supplier quote such as "US $1.98-$2.98". */
const lowestQuote = (range: string) => {
  const values = [...range.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => Number(m[1].replace(",", "")));
  const positive = values.filter((v) => v > 0);
  return positive.length ? Math.min(...positive) : null;
};

/** Supplier terms shown on product pages; they describe purchasing, not stock. */
function supplierSpecs(p: CatalogueProduct): Record<string, string> {
  const out: Record<string, string> = {};
  if (p.sourcing?.priceRange) out.priceRange = p.sourcing.priceRange;
  if (p.sourcing?.minimumOrder) out.minimumOrder = p.sourcing.minimumOrder;
  if (p.sourcing?.unit) out.unit = p.sourcing.unit;
  if (p.sourcing?.capturedAt) out.capturedAt = p.sourcing.capturedAt;
  return out;
}

/** Today's supplier-currency units per GBP, or null when the service is unavailable. */
async function liveRates(): Promise<Record<string, number> | null> {
  try {
    const response = await fetch(RATES_URL, { signal: AbortSignal.timeout(10_000) });
    const rates = ((await response.json()) as { rates?: Record<string, number> }).rates;
    return rates && rates.USD > 0 ? rates : null;
  } catch {
    return null;
  }
}

async function main() {
  const { db, pool, productsTable, usersTable, CHINESE_GOODS, sourcedPriceGbp, catalogueUuid: uuidv5 } = await import("@workspace/db");
  const chinese = new Set<string>(CHINESE_GOODS.platforms);
  try {
    const categories = readCategories();
    const catalogue = readCatalogue();
    const held = heldTaobaoIds();
    const rates = await liveRates();
    // Units of the supplier's currency per GBP: live when available, otherwise
    // the rate the catalogue itself recorded.
    const rateFor = (p: CatalogueProduct, currency: string) => {
      const live = rates?.[currency];
      if (live && live > 0) return live;
      if (currency === "USD") return p.sourcing?.usdPerGbp ?? CATALOGUE_USD_PER_GBP;
      if (p.sourcing?.sourceToGbp) return 1 / p.sourcing.sourceToGbp;
      return null;
    };
    const pricedAt = new Date();


    const [rep] = await db.select({ id: usersTable.id }).from(usersTable).where(sql`${usersTable.email} = ${CHINA_REP_EMAIL}`);
    if (!rep) throw new Error(`${CHINA_REP_EMAIL} must exist (run seed-shop-catalogue once) before importing.`);

    // Existing shop rows, indexed by id and by supplier key (new columns, or the
    // supplier link stored by the earlier seed).
    const existing = (await db.execute(
      sql`SELECT id, price, images, status, source_platform, source_product_id, specs FROM products WHERE channel = 'shop'`,
    )) as { rows: { id: string; price: string; images: string[]; status: string; source_platform: string | null; source_product_id: string | null; specs: Record<string, string> }[] };
    const byId = new Map(existing.rows.map((r) => [r.id, r]));
    const byKey = new Map<string, (typeof existing.rows)[number]>();
    for (const row of existing.rows) {
      if (row.source_platform && row.source_product_id) byKey.set(`${row.source_platform}:${row.source_product_id}`, row);
      const legacy = row.specs?.supplierListing?.match(/_(\d+)\.html/)?.[1];
      if (legacy) byKey.set(`alibaba:${legacy}`, byKey.get(`alibaba:${legacy}`) ?? row);
      if (row.specs?.shopId?.startsWith("t-")) byKey.set(`tuwa:${row.specs.shopId}`, byKey.get(`tuwa:${row.specs.shopId}`) ?? row);
    }

    const seen = new Set<string>();
    const report = { added: 0, updated: 0, duplicates: 0, heldNotPhysical: 0, unknownCategory: 0, quoted: 0, recovered: 0, local: 0, unpriced: 0, priceChanges: 0, biggestChange: 0 };
    const rateUsed: Record<string, number> = {};
    const unknownCategories = new Set<string>();
    const writes: (() => Promise<unknown>)[] = [];

    for (const p of catalogue) {
      const source = sourceOf(p);
      if (source.platform === "taobao" && held.has(source.productId)) {
        report.heldNotPhysical++;
        continue;
      }
      const key = `${source.platform}:${source.productId}`;
      if (seen.has(key)) {
        report.duplicates++;
        continue;
      }
      seen.add(key);
      const category = categories.get(p.category);
      if (!category) {
        report.unknownCategory++;
        unknownCategories.add(p.category);
        continue;
      }

      // Price: supplier cost x 1.30 for Chinese-platform goods.
      let pricing: { price: number; supplierCurrency: string | null; supplierCost: number | null; supplierRate: number | null; markupPercent: number | null; priceBasis: "quoted" | "recovered" | null };
      const quote = p.sourcing?.priceRange ? lowestQuote(p.sourcing.priceRange) : null;
      const currency = (p.sourcing?.currency ?? "USD").toUpperCase();
      const rate = quote ? rateFor(p, currency) : null;
      if (chinese.has(source.platform) && quote && rate) {
        rateUsed[currency] = rate;
        pricing = { price: sourcedPriceGbp(quote, rate), supplierCurrency: currency, supplierCost: quote, supplierRate: rate, markupPercent: CHINESE_GOODS.markupPercent, priceBasis: "quoted" };
        report.quoted++;
      } else if (chinese.has(source.platform) && p.price > 0) {
        // No raw quote: the listed price already includes the markup, so the
        // cost is recovered from it at the catalogue's own rate.
        const cost = Math.round((p.price * CATALOGUE_USD_PER_GBP * 100) / (100 + CHINESE_GOODS.markupPercent) * 10_000) / 10_000;
        pricing = { price: sourcedPriceGbp(cost, CATALOGUE_USD_PER_GBP), supplierCurrency: "USD", supplierCost: cost, supplierRate: CATALOGUE_USD_PER_GBP, markupPercent: CHINESE_GOODS.markupPercent, priceBasis: "recovered" };
        report.recovered++;
      } else if (p.price > 0) {
        pricing = { price: p.price, supplierCurrency: null, supplierCost: null, supplierRate: null, markupPercent: null, priceBasis: null };
        report.local++;
      } else {
        report.unpriced++;
        continue;
      }

      const match = byId.get(uuidv5(p.id)) ?? byKey.get(key);
      const originalPrice = p.originalPrice > p.price ? Math.round((p.originalPrice * pricing.price) / p.price * 100) / 100 : null;
      const fields = {
        title: p.title,
        description: p.description,
        category,
        price: pricing.price,
        originalPrice,
        sourcePlatform: source.platform,
        sourceProductId: source.productId,
        sourceUrl: source.url,
        supplierCurrency: pricing.supplierCurrency,
        supplierCost: pricing.supplierCost,
        supplierRate: pricing.supplierRate,
        markupPercent: pricing.markupPercent,
        priceBasis: pricing.priceBasis,
        pricedAt,
      };
      if (match) {
        const change = Math.abs(Number(match.price) - pricing.price);
        if (change >= 0.01) {
          report.priceChanges++;
          report.biggestChange = Math.max(report.biggestChange, change);
        }
        report.updated++;
        // Keep id, images, status and stock; record the source on the specs too.
        const specs: Record<string, string> = { ...match.specs, shopId: match.specs?.shopId ?? p.id, department: p.category, unitsSold: String(p.sold ?? 0), ...supplierSpecs(p) };
        if (source.url) specs.supplierListing = source.url;
        writes.push(() => db.update(productsTable).set({ ...fields, specs }).where(sql`${productsTable.id} = ${match.id}`));
      } else {
        report.added++;
        const specs: Record<string, string> = { shopId: p.id, department: p.category, unitsSold: String(p.sold ?? 0), ...supplierSpecs(p) };
        if (source.url) specs.supplierListing = source.url;
        const images = [...new Set([p.image, ...(p.images ?? [])])].filter(Boolean);
        writes.push(() =>
          db.insert(productsTable).values({
            id: uuidv5(p.id),
            ...fields,
            rating: p.rating ?? 0,
            reviewCount: 0,
            sellerId: rep.id,
            channel: "shop",
            images,
            stockCount: 0,
            tags: ["imported", source.platform],
            specs,
            status: PUBLISH ? "active" : "unpublished",
          }),
        );
      }
    }

    console.log(`catalogue records: ${catalogue.length}`);
    console.log(`rates per GBP:     ${JSON.stringify(rateUsed)}${rates ? " (live)" : " (catalogue estimates; rate service unavailable)"}`);
    console.log(report);
    if (unknownCategories.size) console.log(`unknown categories: ${[...unknownCategories].join(", ")}`);
    if (DRY_RUN) {
      console.log("(dry run — nothing written)");
      return;
    }
    // Departments the catalogue uses (new ones such as Furniture or Clocks).
    for (const label of categories.values())
      await db.execute(sql`INSERT INTO categories (name, icon) VALUES (${label}, 'Package') ON CONFLICT (name) DO NOTHING`);
    // A few writes at a time; each row is independent, so a re-run picks up
    // where an interrupted one stopped.
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
