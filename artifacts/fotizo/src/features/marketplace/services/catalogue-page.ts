import { api, CATALOG_USE_MOCKS, SHOP_USE_MOCKS } from "@/api";
import type { Product } from "@/types";
import type {
  CatalogueCategory,
  CataloguePage,
  ListCatalogueProductsParams,
} from "@workspace/api-client-react";
export type CatalogueFilters = Omit<ListCatalogueProductsParams, "channel">;
export type CatalogueChannel = "marketplace" | "shop";
export type { CatalogueCategory, CataloguePage };

async function demoProducts(channel: CatalogueChannel): Promise<Product[]> {
  if (channel === "marketplace") {
    const { products } = await import("@/services/mocks/fixtures");
    return products.filter(
      (p) => p.channel !== "shop" && p.status !== "unpublished",
    );
  }
  const { SHOP_PRODUCTS } = await import("@/features/shop/data/products");
  return SHOP_PRODUCTS.map((p) => ({
    ...p,
    channel: "shop",
    status: "active",
    seller: "Fotizo Shop",
    sellerId: "demo-shop",
    originalPrice: p.originalPrice,
    reviewCount: 0,
    inStock: (p.stockCount ?? 1) > 0,
    stockCount: p.stockCount ?? 1,
    tags: [],
    specs: { department: p.category },
  }));
}
const isDemo = (channel: CatalogueChannel) =>
  channel === "shop" ? SHOP_USE_MOCKS : CATALOG_USE_MOCKS;
export const cataloguePages = {
  async list(
    channel: CatalogueChannel,
    filters: CatalogueFilters = {},
  ): Promise<CataloguePage> {
    if (!isDemo(channel))
      return api.get<CataloguePage>("/products", { ...filters, channel });
    const q = (filters.q ?? "").trim().toLowerCase();
    const discount = (p: Product) =>
      p.originalPrice && p.originalPrice > p.price
        ? (p.originalPrice - p.price) / p.originalPrice
        : 0;
    const all = (await demoProducts(channel)).filter(
      (p) =>
        (!q ||
          [p.title, p.seller, p.category].some((v) =>
            v.toLowerCase().includes(q),
          )) &&
        (!filters.category || p.category === filters.category) &&
        (!filters.inStock || p.inStock) &&
        (filters.minPrice === undefined || p.price >= filters.minPrice) &&
        (filters.maxPrice === undefined || p.price <= filters.maxPrice) &&
        (filters.minRating === undefined || p.rating >= filters.minRating) &&
        (!filters.discounted || discount(p) > 0),
    );
    all.sort(
      (a, b) =>
        (filters.sort === "price-asc"
          ? a.price - b.price
          : filters.sort === "price-desc"
            ? b.price - a.price
            : filters.sort === "rating"
              ? b.rating - a.rating
              : filters.sort === "discount"
                ? discount(b) - discount(a)
                : 0) || b.id.localeCompare(a.id),
    );
    const page = filters.page ?? 0,
      pageSize = filters.pageSize ?? 24;
    return {
      items: all
        .slice(page * pageSize, (page + 1) * pageSize)
        .map((p) => ({ ...p, channel, status: "active" })),
      total: all.length,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < all.length,
    };
  },
  async categories(channel: CatalogueChannel): Promise<CatalogueCategory[]> {
    if (!isDemo(channel))
      return api.get<CatalogueCategory[]>("/products/categories", { channel });
    const counts = new Map<string, CatalogueCategory>();
    for (const p of await demoProducts(channel)) {
      const current = counts.get(p.category);
      counts.set(p.category, {
        category: p.category,
        count: (current?.count ?? 0) + 1,
        image: current?.image || p.image,
      });
    }
    return [...counts.values()].sort((a, b) =>
      a.category.localeCompare(b.category),
    );
  },
};
