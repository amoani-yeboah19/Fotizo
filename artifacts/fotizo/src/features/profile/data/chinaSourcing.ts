import { VEHICLES } from "@/features/autos/data/vehicles";
import { SHOP_CATEGORIES, SHOP_PRODUCTS } from "@/features/shop/data/products";

// Figures behind the China Representative dashboard.
//
// Everything the shop and autos catalogues already know is DERIVED from them
// rather than retyped, the same way the home page builds Explore Categories from
// the real departments. Hardcoding "138 SKUs" here would go stale the first time
// someone adds a product, and the dashboard would then quietly lie about stock.
//
// The operational side — suppliers, containers, QC — has no source in the app
// yet, so it is sample data, flagged as such below and kept in one block so it
// is obvious what needs replacing when the sourcing backend lands.

// ── Autos ────────────────────────────────────────────────────────────────────

/**
 * Marques owned by Chinese manufacturers. Note this is about who owns the
 * marque, NOT where the car is built: several Toyota and Hyundai models in the
 * range are China-market builds too. The rep needs the marque split because
 * that is what drives which factory relationship handles the order.
 */
const CHINA_MARQUES = new Set([
  "BYD",
  "Changan",
  "Jetour",
  "Geely",
  "Haval",
  "Avatr",
  "Landwind",
]);

export interface MarqueRow {
  make: string;
  units: number;
  chineseMarque: boolean;
  /** Mean indicative landed price across that marque's models, in GBP. */
  avgLandedPrice: number;
  /** Widest order-to-handover window across the marque, in weeks. */
  leadTimeWeeks: [number, number];
}

export const MARQUE_ROWS: MarqueRow[] = (() => {
  const byMake = new Map<string, typeof VEHICLES>();
  for (const v of VEHICLES) {
    const list = byMake.get(v.make) ?? [];
    list.push(v);
    byMake.set(v.make, list);
  }

  return [...byMake.entries()]
    .map(([make, models]) => ({
      make,
      units: models.length,
      chineseMarque: CHINA_MARQUES.has(make),
      avgLandedPrice: Math.round(
        models.reduce((sum, m) => sum + m.landedPrice, 0) / models.length,
      ),
      leadTimeWeeks: [
        Math.min(...models.map((m) => m.leadTimeWeeks[0])),
        Math.max(...models.map((m) => m.leadTimeWeeks[1])),
      ] as [number, number],
    }))
    .sort((a, b) => b.units - a.units || a.make.localeCompare(b.make));
})();

export const AUTOS_TOTAL = VEHICLES.length;
export const CHINA_MARQUE_UNITS = MARQUE_ROWS.filter((m) => m.chineseMarque).reduce(
  (sum, m) => sum + m.units,
  0,
);
export const CHINA_MARQUE_COUNT = MARQUE_ROWS.filter((m) => m.chineseMarque).length;

/** Petrol / hybrid / electric split across the range — drives which factories matter. */
export const FUEL_MIX = (() => {
  const counts = { petrol: 0, hybrid: 0, electric: 0 };
  for (const v of VEHICLES) counts[v.fuel] += 1;
  return (Object.keys(counts) as (keyof typeof counts)[])
    .map((fuel) => ({
      fuel,
      units: counts[fuel],
      share: Math.round((counts[fuel] / VEHICLES.length) * 100),
    }))
    .filter((f) => f.units > 0)
    .sort((a, b) => b.units - a.units);
})();

// ── Shop ─────────────────────────────────────────────────────────────────────

export interface DepartmentRow {
  id: string;
  label: string;
  skus: number;
  /** Listings the catalogue already flags as nearly sold out. */
  restock: number;
  /** Mean price across the department, in GBP. */
  avgPrice: number;
}

export const DEPARTMENT_ROWS: DepartmentRow[] = SHOP_CATEGORIES.map((cat) => {
  const items = SHOP_PRODUCTS.filter((p) => p.category === cat.id);
  return {
    id: cat.id,
    label: cat.label,
    skus: items.length,
    restock: items.filter((p) => p.almostGone).length,
    avgPrice: items.length
      ? Math.round(items.reduce((sum, p) => sum + p.price, 0) / items.length)
      : 0,
  };
})
  .filter((d) => d.skus > 0)
  .sort((a, b) => b.skus - a.skus);

export const SHOP_SKU_TOTAL = SHOP_PRODUCTS.length;
export const SHOP_DEPARTMENT_TOTAL = DEPARTMENT_ROWS.length;
export const SHOP_RESTOCK_TOTAL = SHOP_PRODUCTS.filter((p) => p.almostGone).length;

/** The listings actually needing a reorder, worst first. */
export const RESTOCK_QUEUE = SHOP_PRODUCTS.filter((p) => p.almostGone)
  .slice()
  .sort((a, b) => b.sold - a.sold)
  .slice(0, 8);

// ── Operational sample data ──────────────────────────────────────────────────
// SAMPLE. No backend source exists for any of this yet. Replace wholesale when
// the sourcing service ships; nothing else in the app reads it.

export interface Supplier {
  id: string;
  name: string;
  city: string;
  scope: "shop" | "autos";
  lines: number;
  onTimeRate: number;
  status: "active" | "review" | "suspended";
}

export const SUPPLIERS: Supplier[] = [
  { id: "s1", name: "Yiwu Trade Hub", city: "Yiwu, Zhejiang", scope: "shop", lines: 412, onTimeRate: 96, status: "active" },
  { id: "s2", name: "Guangzhou Textile Group", city: "Guangzhou, Guangdong", scope: "shop", lines: 268, onTimeRate: 92, status: "active" },
  { id: "s3", name: "Shenzhen Electronics Direct", city: "Shenzhen, Guangdong", scope: "shop", lines: 197, onTimeRate: 89, status: "active" },
  { id: "s4", name: "Chongqing Motor Export", city: "Chongqing", scope: "autos", lines: 24, onTimeRate: 94, status: "active" },
  { id: "s5", name: "Xi'an Auto Logistics", city: "Xi'an, Shaanxi", scope: "autos", lines: 11, onTimeRate: 78, status: "review" },
  { id: "s6", name: "Foshan Home Living", city: "Foshan, Guangdong", scope: "shop", lines: 143, onTimeRate: 61, status: "suspended" },
];

export interface Shipment {
  id: string;
  mode: "air" | "sea";
  scope: "shop" | "autos";
  port: string;
  units: number;
  status: "loading" | "in_transit" | "customs" | "arrived";
  eta: string;
}

export const SHIPMENTS: Shipment[] = [
  { id: "CN-4471", mode: "sea", scope: "shop", port: "Tema, Ghana", units: 1840, status: "in_transit", eta: "12 Sep" },
  { id: "CN-4472", mode: "air", scope: "shop", port: "Kotoka, Accra", units: 260, status: "customs", eta: "27 Aug" },
  { id: "CN-4473", mode: "sea", scope: "autos", port: "Tema, Ghana", units: 6, status: "loading", eta: "3 Oct" },
  { id: "CN-4474", mode: "sea", scope: "shop", port: "Felixstowe, UK", units: 2210, status: "in_transit", eta: "19 Sep" },
  { id: "CN-4475", mode: "sea", scope: "autos", port: "Southampton, UK", units: 4, status: "arrived", eta: "Delivered" },
  { id: "CN-4476", mode: "air", scope: "shop", port: "Kotoka, Accra", units: 145, status: "loading", eta: "1 Sep" },
];

export const UNITS_IN_TRANSIT = SHIPMENTS.filter(
  (s) => s.status === "in_transit" || s.status === "customs",
).reduce((sum, s) => sum + s.units, 0);

export const SUPPLIER_ACTIVE = SUPPLIERS.filter((s) => s.status === "active").length;
export const SUPPLIER_FLAGGED = SUPPLIERS.filter((s) => s.status !== "active").length;

/** Outbound volume by month — sample, for the overview trend. */
export const OUTBOUND_TREND = [
  { name: "Mar", units: 3200 },
  { name: "Apr", units: 4100 },
  { name: "May", units: 3850 },
  { name: "Jun", units: 5200 },
  { name: "Jul", units: 6050 },
  { name: "Aug", units: 6480 },
];
