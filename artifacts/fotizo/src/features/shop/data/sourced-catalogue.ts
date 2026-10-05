import type { ShopProduct } from "./shop-product";

export async function loadSourcedCatalogue(): Promise<ShopProduct[]> {
  const [
    { default: rows },
    { default: detailed },
    { default: home },
    { default: more },
  ] = await Promise.all([
    import("./1688-products.json"),
    import("./1688-detail-products.json"),
    import("./1688-home-products.json"),
    import("./1688-more-products.json"),
  ]);
  const seen = new Set<string>();
  return [...detailed, ...more, ...home, ...rows].filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}
