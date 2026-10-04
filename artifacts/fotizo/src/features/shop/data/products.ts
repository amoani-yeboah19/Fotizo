import taobaoProducts from "./taobao-products.json";
import { SHOP_CATEGORIES } from "@/features/shop/data/categories";

// Re-exported so the shop pages can keep importing departments and listings
// from one place. Light consumers (the Footer) should import from
// ./categories directly — see the note there.
export {
  SHOP_CATEGORIES,
  categoryLabel,
} from "@/features/shop/data/categories";
export type { ShopCategory } from "@/features/shop/data/categories";
import { discountPct, type ShopProduct } from "./shop-product";
export { discountPct, soldLabel, type ShopProduct } from "./shop-product";

// Fotizo Shop catalog — real products sourced from the supplier storefront.
// Prices are stored in the app's base currency (GBP); the Price component
// converts to the active currency (the ₵ prices convert back at the app's
// GHS rate). Images are hosted by the supplier and load over HTTPS.

// Retired Alibaba.com stock stays out of the local/demo catalogue.
export const SHOP_PRODUCTS: ShopProduct[] = [...taobaoProducts];

// These take the catalogue as an argument rather than closing over
// SHOP_PRODUCTS, so the same logic serves the committed file and the listings
// fetched from the API (see features/shop/services). Callers with no live data
// pass SHOP_PRODUCTS directly.

export function getShopProduct(
  products: ShopProduct[],
  id: string,
): ShopProduct | undefined {
  return products.find((p) => p.id === id);
}

export function shopProductsByCategory(
  products: ShopProduct[],
  categoryId: string | null,
): ShopProduct[] {
  if (!categoryId) return products;
  return products.filter((p) => p.category === categoryId);
}

// Most-discounted items, for the "Lightning Deals" strip.
export function flashDeals(products: ShopProduct[], limit = 12): ShopProduct[] {
  return [...products]
    .filter((p) => discountPct(p) > 0)
    .sort((a, b) => discountPct(b) - discountPct(a))
    .slice(0, limit);
}

export function relatedShopProducts(
  products: ShopProduct[],
  product: ShopProduct,
  limit = 6,
): ShopProduct[] {
  return products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, limit);
}

export interface ShopCategoryCard {
  id: string;
  label: string;
  /** Cover art selected to represent the department, not a random first product. */
  image: string;
  count: number;
  href: string;
}

const CATEGORY_COVER_ART: Record<string, string> = {
  mens: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
  jackets:
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
  beauty:
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
  car: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
  womens:
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
};

/**
 * Shop departments that actually have stock, biggest first, each with curated
 * cover art so the homepage cards represent the category, not whichever product
 * happened to appear first in the catalogue.
 */
export function shopCategoryCards(
  products: ShopProduct[] = SHOP_PRODUCTS,
): ShopCategoryCard[] {
  return SHOP_CATEGORIES.map((cat) => {
    const items = products.filter((p) => p.category === cat.id);
    const image = CATEGORY_COVER_ART[cat.id] ?? items[0]?.image ?? "";

    return {
      id: cat.id,
      label: cat.label,
      image,
      count: items.length,
      href: `/shop?category=${cat.id}`,
    };
  })
    .filter((c) => c.count > 0 && c.image)
    .sort((a, b) => b.count - a.count);
}
