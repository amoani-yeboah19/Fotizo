import { useMemo } from "react";
import { useSales, useSellerProducts } from "@/features/profile/hooks";
import { useStaffQuery } from "@/features/profile/components/Operations";
import { operationsService } from "@/features/profile/services/operations.service";
import { SHOP_CATEGORIES } from "@/features/shop/data/categories";

// Figures behind the China Representative dashboard, computed from stored
// records: this account's shop listings (GET /seller/products), its order lines
// (GET /sales) and the vehicle catalogue (GET /operations/vehicles).
//
// Suppliers, purchase orders and shipments are not recorded anywhere yet, so
// those lists are empty until the sourcing workflow exists.

/**
 * Marques owned by Chinese manufacturers. Note this is about who owns the
 * marque, NOT where the car is built. The rep needs the marque split because
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

/** Live listings at or below this stock level need a reorder. */
const RESTOCK_AT = 5;

export interface MarqueRow {
  make: string;
  units: number;
  chineseMarque: boolean;
  /** Mean indicative landed price across that marque's models, in GBP. */
  avgLandedPrice: number;
  /** Widest order-to-handover window across the marque, in weeks. */
  leadTimeWeeks: [number, number];
}

export interface DepartmentRow {
  id: string;
  label: string;
  skus: number;
  /** Live listings at or below the reorder level. */
  restock: number;
  /** Mean price across the department, in GBP. */
  avgPrice: number;
}

export interface Supplier {
  id: string;
  name: string;
  city: string;
  scope: "shop" | "autos";
  lines: number;
  onTimeRate: number;
  status: "active" | "review" | "suspended";
}

export interface Shipment {
  id: string;
  mode: "air" | "sea";
  scope: "shop" | "autos";
  port: string;
  units: number;
  status: "loading" | "in_transit" | "customs" | "arrived";
  eta: string;
}

const SUPPLIERS: Supplier[] = [];
const SHIPMENTS: Shipment[] = [];

export function useChinaSourcing() {
  const listingQuery = useSellerProducts();
  const salesQuery = useSales();
  const vehicleQuery = useStaffQuery(["vehicles"], operationsService.vehicles);
  const listings = listingQuery.data ?? [];
  const sales = salesQuery.data ?? [];
  const vehicles = vehicleQuery.data ?? [];

  const metrics = useMemo(() => {
    const byMake = new Map<string, typeof vehicles>();
    for (const v of vehicles)
      byMake.set(v.make, [...(byMake.get(v.make) ?? []), v]);
    const MARQUE_ROWS: MarqueRow[] = [...byMake.entries()]
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
    const chinese = MARQUE_ROWS.filter((m) => m.chineseMarque);

    const fuelCounts = { petrol: 0, hybrid: 0, electric: 0 };
    for (const v of vehicles) fuelCounts[v.fuel] += 1;
    const FUEL_MIX = (Object.keys(fuelCounts) as (keyof typeof fuelCounts)[])
      .map((fuel) => ({
        fuel,
        units: fuelCounts[fuel],
        share: vehicles.length
          ? Math.round((fuelCounts[fuel] / vehicles.length) * 100)
          : 0,
      }))
      .filter((f) => f.units > 0)
      .sort((a, b) => b.units - a.units);

    const live = listings.filter((p) => p.status !== "unpublished");
    const needsRestock = (p: (typeof listings)[number]) =>
      p.status !== "unpublished" && p.stock <= RESTOCK_AT;
    const labels = new Map(SHOP_CATEGORIES.map((c) => [c.id, c.label]));
    const byDepartment = new Map<string, typeof listings>();
    for (const p of live)
      byDepartment.set(p.category, [
        ...(byDepartment.get(p.category) ?? []),
        p,
      ]);
    const DEPARTMENT_ROWS: DepartmentRow[] = [...byDepartment.entries()]
      .map(([id, items]) => ({
        id,
        label: labels.get(id) ?? id,
        skus: items.length,
        restock: items.filter(needsRestock).length,
        avgPrice: Math.round(
          items.reduce((sum, p) => sum + p.price, 0) / items.length,
        ),
      }))
      .sort((a, b) => b.skus - a.skus);

    const RESTOCK_QUEUE = listings
      .filter(needsRestock)
      .map((p) => ({
        id: p.id,
        title: p.title,
        image: p.image,
        price: p.price,
        sold: p.sales,
      }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 8);

    // Units sold per calendar month (UTC), last six months, excluding cancelled.
    const now = new Date();
    const OUTBOUND_TREND = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1),
      );
      const key = d.toISOString().slice(0, 7);
      return {
        name: d.toLocaleDateString("en-GB", {
          month: "short",
          timeZone: "UTC",
        }),
        units: sales
          .filter((o) => o.status !== "cancelled" && o.date.startsWith(key))
          .reduce((sum, o) => sum + o.quantity, 0),
      };
    });

    return {
      MARQUE_ROWS,
      AUTOS_TOTAL: vehicles.length,
      CHINA_MARQUE_UNITS: chinese.reduce((sum, m) => sum + m.units, 0),
      CHINA_MARQUE_COUNT: chinese.length,
      FUEL_MIX,
      DEPARTMENT_ROWS,
      SHOP_SKU_TOTAL: live.length,
      SHOP_DEPARTMENT_TOTAL: DEPARTMENT_ROWS.length,
      SHOP_RESTOCK_TOTAL: listings.filter(needsRestock).length,
      RESTOCK_QUEUE,
      SUPPLIERS,
      SUPPLIER_ACTIVE: SUPPLIERS.filter((s) => s.status === "active").length,
      SUPPLIER_FLAGGED: SUPPLIERS.filter((s) => s.status !== "active").length,
      SHIPMENTS,
      UNITS_IN_TRANSIT: SHIPMENTS.filter(
        (s) => s.status === "in_transit" || s.status === "customs",
      ).reduce((sum, s) => sum + s.units, 0),
      OUTBOUND_TREND,
    };
  }, [listings, sales, vehicles]);
  return {
    ...metrics,
    listingLoading: listingQuery.isLoading,
    listingError: listingQuery.isError,
    isLoading:
      listingQuery.isLoading || salesQuery.isLoading || vehicleQuery.isLoading,
    isError: listingQuery.isError || salesQuery.isError || vehicleQuery.isError,
    retry: () => {
      void listingQuery.refetch();
      void salesQuery.refetch();
      void vehicleQuery.refetch();
    },
  };
}
