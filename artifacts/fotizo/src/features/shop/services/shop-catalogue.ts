import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  cataloguePages,
  type CatalogueFilters,
} from "@/features/marketplace/services/catalogue-page";
import { loadSourcedCatalogue } from "../data/sourced-catalogue";
import { toShopProduct } from "./shop.service";
import type { ShopProduct } from "../data/shop-product";

// Temporary frontend sourcing overlay. Marketplace queries remain server-only.
// Fetch enough of the sorted server prefix to merge an accurate catalogue page.
const serverPages = new Map<
  string,
  { at: number; value: ReturnType<typeof cataloguePages.list> }
>();
export function clearShopCatalogueCache() {
  serverPages.clear();
}
function serverPage(filters: CatalogueFilters) {
  const key = JSON.stringify(filters);
  const cached = serverPages.get(key);
  if (cached && Date.now() - cached.at < 60_000) return cached.value;
  const value = cataloguePages.list("shop", filters);
  serverPages.set(key, { at: Date.now(), value });
  value.catch(() => serverPages.delete(key));
  return value;
}

export async function shopCataloguePage(filters: CatalogueFilters = {}) {
  const page = filters.page ?? 0,
    pageSize = filters.pageSize ?? 48;
  const q = (filters.q ?? "").trim().toLowerCase();
  const imported = (await loadSourcedCatalogue()).filter(
    (p) =>
      !filters.sellerId &&
      !filters.inStock &&
      (!filters.category || p.category === filters.category) &&
      (!q ||
        `${p.title} ${p.description} ${p.category}`
          .toLowerCase()
          .includes(q)) &&
      (filters.minPrice === undefined || p.price >= filters.minPrice) &&
      (filters.maxPrice === undefined || p.price <= filters.maxPrice) &&
      (!filters.minRating || p.rating >= filters.minRating) &&
      (!filters.discounted || p.originalPrice > p.price),
  );
  const first = await Promise.allSettled([
    serverPage({ ...filters, page: 0, pageSize }),
  ]);
  const serverTotal =
    first[0].status === "fulfilled" ? first[0].value.total : 0;
  const needed =
    filters.sort === "newest" && imported.length >= (page + 1) * pageSize
      ? 1
      : page + 1;
  const count = Math.min(needed, Math.ceil(serverTotal / pageSize));
  const responses = [
    ...first,
    ...(await Promise.allSettled(
      Array.from({ length: Math.max(0, count - 1) }, (_, index) =>
        serverPage({ ...filters, page: index + 1, pageSize }),
      ),
    )),
  ];
  const pages = responses.flatMap((r) =>
    r.status === "fulfilled" ? [r.value] : [],
  );
  const live = pages.flatMap((p) => p.items.map(toShopProduct));
  const liveSources = new Set(
    live
      .filter((p) => p.sourcing?.platform === "1688")
      .map((p) => p.sourcing!.productId),
  );
  const local = imported.filter(
    (p) => !liveSources.has(p.id.replace("1688-", "")),
  );
  const all = [...local, ...live];
  const discount = (p: ShopProduct) =>
    p.originalPrice > p.price
      ? (p.originalPrice - p.price) / p.originalPrice
      : 0;
  if (filters.sort && filters.sort !== "newest")
    all.sort((a, b) =>
      filters.sort === "price-asc"
        ? a.price - b.price
        : filters.sort === "price-desc"
          ? b.price - a.price
          : filters.sort === "rating"
            ? b.rating - a.rating
            : filters.sort === "best-selling"
              ? b.sold - a.sold
              : discount(b) - discount(a),
    );
  const total = local.length + (pages[0]?.total ?? 0);
  return {
    items: all.slice(page * pageSize, (page + 1) * pageSize),
    total,
    page,
    pageSize,
    hasMore: (page + 1) * pageSize < total,
    liveError: responses.some((r) => r.status === "rejected"),
  };
}

export function useShopCatalogueInfinite(
  _channel: "shop",
  filters: CatalogueFilters,
) {
  return useInfiniteQuery({
    queryKey: ["shop", "combined", filters],
    queryFn: ({ pageParam }) =>
      shopCataloguePage({ ...filters, page: pageParam, pageSize: 48 }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
}
export function useShopCataloguePage(
  _channel: "shop",
  filters: CatalogueFilters,
) {
  return useQuery({
    queryKey: ["shop", "combined-page", filters],
    queryFn: () => shopCataloguePage(filters),
  });
}
