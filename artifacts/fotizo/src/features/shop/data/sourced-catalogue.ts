import type { ShopProduct } from "./shop-product";

export async function loadSourcedCatalogue(): Promise<ShopProduct[]> {
  const [{ default: rows }, { default: detailed }] = await Promise.all([
    import("./1688-products.json"),
    import("./1688-detail-products.json"),
  ]);
  const detailedIds = new Set(detailed.map((p) => p.id));
  return [...detailed, ...rows.filter((p) => !detailedIds.has(p.id))];
}
