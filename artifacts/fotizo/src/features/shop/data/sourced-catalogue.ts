import type { ShopProduct } from "./shop-product";

export async function loadSourcedCatalogue(): Promise<ShopProduct[]> {
  const { default: rows } = await import("./1688-products.json");
  return rows;
}
