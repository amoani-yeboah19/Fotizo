import type { ShopProduct } from "./shop-product";

// The restored Alibaba selection (restored-alibaba-products.json) is not shown
// in the shop: those listings are unpublished in the database, where managers
// review them under Publication controls and can publish them individually.

export async function loadSourcedCatalogue(): Promise<ShopProduct[]> {
  const [
    { default: rows },
    { default: detailed },
    { default: home },
    { default: more },
    { default: shoes },
    { default: departments },
    { default: family },
  ] = await Promise.all([
    import("./1688-products.json"),
    import("./1688-detail-products.json"),
    import("./1688-home-products.json"),
    import("./1688-more-products.json"),
    import("./1688-shoes-products.json"),
    import("./1688-departments-products.json"),
    import("./1688-family-products.json"),
  ]);
  const seen = new Set<string>();
  return [
    ...family,
    ...departments,
    ...shoes,
    ...detailed,
    ...more,
    ...home,
    ...rows,
  ].filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}
