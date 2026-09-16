import { api, SHOP_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import type { Product } from "@/types";
import { SHOP_CATEGORIES } from "@/features/shop/data/categories";
import { SHOP_PRODUCTS, type ShopProduct } from "@/features/shop/data/products";

// The shop storefront's data access. Mirrors marketplace/services/catalog for
// the seller side, but the shop has its own shape (departments, units sold,
// free-shipping and almost-gone badges) that the marketplace Product does not.

/**
 * Department label -> id, so a product that came back with only its display
 * name ("Wigs & Hair") still lands in the right aisle. The seed writes the id
 * into specs.department, so this is only the fallback for rows created some
 * other way — a listing posted from the dashboard, say.
 */
const ID_BY_LABEL = new Map(SHOP_CATEGORIES.map((c) => [c.label.toLowerCase(), c.id]));

const flag = (specs: Record<string, string>, key: string) => specs[key] === "true";

/**
 * API Product -> ShopProduct.
 *
 * The products table has no column for units sold, the shipping badges or the
 * supplier link, so the seed script stores them in `specs` (a jsonb string map)
 * rather than widening the schema for one storefront. This unpacks them again.
 */
export function toShopProduct(p: Product): ShopProduct {
  const specs = (p.specs ?? {}) as Record<string, string>;
  const sold = Number(specs.unitsSold);

  return {
    id: p.id,
    title: p.title,
    category: specs.department ?? ID_BY_LABEL.get(p.category?.toLowerCase() ?? "") ?? p.category,
    price: p.price,
    // The column stores NULL for "no discount"; the shop encodes that as the
    // two prices being equal, which is what discountPct() reads.
    originalPrice: p.originalPrice ?? p.price,
    rating: p.rating ?? 0,
    sold: Number.isFinite(sold) ? sold : 0,
    image: p.image || p.images?.[0] || "",
    images: p.images ?? [],
    freeShipping: flag(specs, "freeShipping"),
    almostGone: flag(specs, "almostGone"),
    description: p.description,
    sourceUrl: specs.supplierListing,
  };
}

export const shopService = {
  async listProducts(): Promise<ShopProduct[]> {
    if (SHOP_USE_MOCKS) {
      await delay();
      return SHOP_PRODUCTS;
    }
    // Deliberately unpaginated: the whole catalogue is ~164 KB gzipped, and
    // fetching it once keeps search, sorting and the deal strip working across
    // the full set rather than within a page. Worth revisiting in the
    // thousands, not the hundreds.
    const products = await api.get<Product[]>("/products");
    return products.map(toShopProduct);
  },

  async getProduct(id: string): Promise<ShopProduct | null> {
    if (SHOP_USE_MOCKS) {
      await delay();
      return SHOP_PRODUCTS.find((p) => p.id === id) ?? null;
    }
    try {
      return toShopProduct(await api.get<Product>(`/products/${id}`));
    } catch {
      // A missing or unpublished listing is a 404 — a normal outcome here, not
      // an error state, so the page can show "not found" instead of a failure.
      return null;
    }
  },
};
