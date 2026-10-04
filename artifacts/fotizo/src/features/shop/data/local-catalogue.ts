import type { ShopProduct } from "./shop-product";

// The bundled preview catalogue is several megabytes, so it is only fetched by
// builds that actually show it (shop-preview and demo), never by production.
let byId: Map<string, ShopProduct> | null = null;

export async function loadLocalCatalogue(): Promise<ShopProduct[]> {
  const { SHOP_PRODUCTS } = await import("./products");
  byId ??= new Map(SHOP_PRODUCTS.map((p) => [p.id, p]));
  return SHOP_PRODUCTS;
}

/** A preview record by id, once loadLocalCatalogue has run. */
export const localShopProduct = (id: string) => byId?.get(id);
