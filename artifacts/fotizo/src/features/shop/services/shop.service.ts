import { visibleProduct } from "@/features/catalogue/launch-policy";
import { loadSourcedCatalogue } from "../data/sourced-catalogue";
import { api, ApiError, SHOP_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import type { Product } from "@/types";
import { SHOP_CATEGORIES } from "@/features/shop/data/categories";
import type { ShopProduct } from "@/features/shop/data/shop-product";
import {
  loadLocalCatalogue,
  localShopProduct,
} from "@/features/shop/data/local-catalogue";

// The shop storefront's data access. Mirrors marketplace/services/catalog for
// the seller side, but the shop has its own shape (departments, units sold,
// free-shipping and almost-gone badges) that the marketplace Product does not.

/**
 * Department label -> id, so a product that came back with only its display
 * name ("Wigs & Hair") still lands in the right aisle. The seed writes the id
 * into specs.department, so this is only the fallback for rows created some
 * other way — a listing posted from the dashboard, say.
 */
const ID_BY_LABEL = new Map(
  SHOP_CATEGORIES.map((c) => [c.label.toLowerCase(), c.id]),
);

const flag = (specs: Record<string, string>, key: string) =>
  specs[key] === "true";

/**
 * API Product -> ShopProduct.
 *
 * The products table has no column for units sold, the shipping badges or the
 * supplier link, so the seed script stores them in `specs` (a jsonb string map)
 * rather than widening the schema for one storefront. This unpacks them again.
 */
export function toShopProduct(p: Product): ShopProduct {
  // Keep source metadata and estimated-price labels on local catalogue cards.
  if (SHOP_USE_MOCKS) {
    const local = localShopProduct(p.id);
    if (local) return local;
  }
  const specs = (p.specs ?? {}) as Record<string, string>;
  const sold = Number(specs.unitsSold);

  return {
    id: p.id,
    stockCount: p.stockCount,
    title: p.title,
    category:
      specs.department ??
      ID_BY_LABEL.get(p.category?.toLowerCase() ?? "") ??
      p.category,
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
    sourceUrl: p.sourcing?.sourceUrl ?? specs.supplierListing,
    // Supplier terms from the server: price range, minimum order and unit.
    ...(p.sourcing && p.sourcing.priceRange
      ? {
          sourcing: {
            platform: p.sourcing.platform,
            productId: p.sourcing.productId,
            originalTitle: p.title,
            sourcePage: p.sourcing.sourceUrl ?? "",
            capturedAt: p.sourcing.capturedAt ?? "",
            currency: p.sourcing.currency ?? "",
            priceRange: p.sourcing.priceRange,
            minimumOrder: p.sourcing.minimumOrder ?? null,
            unit: p.sourcing.unit ?? null,
            originalImage: p.images?.[0] ?? "",
            priceStatus: p.sourcing.priceStatus,
            previewMarkup: 1.3,
          },
        }
      : {}),
  };
}

export const shopService = {
  async relatedProducts(id: string): Promise<ShopProduct[]> {
    if (id.startsWith("1688-") || id.startsWith("preview-1688-")) {
      const rows = await loadSourcedCatalogue();
      const current = rows.find((p) => p.id === id.replace(/^preview-/, ""));
      return current
        ? rows
            .filter(
              (p) =>
                p.category === current.category &&
                p.id !== id.replace(/^preview-/, ""),
            )
            .slice(0, 6)
        : [];
    }
    if (SHOP_USE_MOCKS) {
      const products = await loadLocalCatalogue();
      const product = products.find(
        (p) => p.id === id.replace(/^preview-/, ""),
      );
      return product
        ? products
            .filter(
              (p) =>
                p.category === product.category &&
                p.id !== id.replace(/^preview-/, ""),
            )
            .slice(0, 6)
        : [];
    }
    return (await api.get<Product[]>(`/products/${id}/related`))
      .filter((p) => p.channel === "shop" && visibleProduct(p))
      .map(toShopProduct);
  },

  async getProduct(id: string): Promise<ShopProduct | null> {
    if (id.startsWith("1688-") || id.startsWith("preview-1688-"))
      return (
        (await loadSourcedCatalogue()).find(
          (p) => p.id === id.replace(/^preview-/, ""),
        ) ?? null
      );
    if (SHOP_USE_MOCKS) {
      await delay();
      return (
        (await loadLocalCatalogue()).find(
          (p) => p.id === id.replace(/^preview-/, ""),
        ) ?? null
      );
    }
    try {
      const product = await api.get<Product>(`/products/${id}`);
      return product.channel === "shop" && visibleProduct(product)
        ? toShopProduct(product)
        : null;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      // A missing or unpublished listing is a 404 — a normal outcome here, not
      // an error state, so the page can show "not found" instead of a failure.
      return null;
    }
  },
};
