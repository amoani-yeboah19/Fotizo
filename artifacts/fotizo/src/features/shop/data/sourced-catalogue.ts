import type { ShopProduct } from "./shop-product";

export async function loadSourcedCatalogue(): Promise<ShopProduct[]> {
  const [
    { default: rows },
    { default: detailed },
    { default: home },
    { default: more },
    { default: restored },
    { default: shoes },
  ] = await Promise.all([
    import("./1688-products.json"),
    import("./1688-detail-products.json"),
    import("./1688-home-products.json"),
    import("./1688-more-products.json"),
    import("./restored-alibaba-products.json"),
    import("./1688-shoes-products.json"),
  ]);
  const seen = new Set<string>();
  return [...shoes, ...restored, ...detailed, ...more, ...home, ...rows].filter(
    (product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    },
  );
}
