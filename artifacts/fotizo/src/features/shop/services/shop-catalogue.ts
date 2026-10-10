import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  cataloguePages,
  type CatalogueFilters,
} from "@/features/marketplace/services/catalogue-page";
import { loadSourcedCatalogue } from "../data/sourced-catalogue";
import { offerOf, publishedOffers, toShopProduct, withLocalDetails } from "./shop.service";
import { matchesCollection } from "../data/shop-discovery";
export type ShopCatalogueFilters = CatalogueFilters & { collection?: string };
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

export async function shopCataloguePage(input: ShopCatalogueFilters = {}) {
  const { collection, ...filters } = input;
  const page = filters.page ?? 0,
    pageSize = filters.pageSize ?? 48;
  const livePageSize = collection ? Math.max(96, pageSize) : pageSize;
  const q = (filters.q ?? "").trim().toLowerCase();
  // Published offers come from the server (once, with correct totals); only
  // unpublished preview items are merged in from the local files.
  const [sourced, published] = await Promise.all([
    loadSourcedCatalogue(),
    publishedOffers().catch(() => new Set<string>()),
  ]);
  const localByOffer = new Map(
    sourced.flatMap((p) => {
      const offer = offerOf(p.id);
      return offer ? [[offer, p] as const] : [];
    }),
  );
  const imported = sourced.filter(
    (p) =>
      !published.has(offerOf(p.id) ?? "") &&
      matchesCollection(p, collection) &&
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
    serverPage({ ...filters, page: 0, pageSize: livePageSize }),
  ]);
  const serverTotal =
    first[0].status === "fulfilled" ? first[0].value.total : 0;
  const needed = collection
    ? Math.ceil(serverTotal / livePageSize)
    : filters.sort === "newest" && imported.length >= (page + 1) * pageSize
      ? 1
      : page + 1;
  const count = Math.min(needed, Math.ceil(serverTotal / livePageSize));
  const responses = [...first];
  // Subcollections are frontend facets until the API supports taxonomy filters.
  // Filter the complete department before pagination, never just loaded cards.
  for (let start = 1; start < count; start += 4) {
    responses.push(
      ...(await Promise.allSettled(
        Array.from({ length: Math.min(4, count - start) }, (_, i) =>
          serverPage({ ...filters, page: start + i, pageSize: livePageSize }),
        ),
      )),
    );
  }
  const pages = responses.flatMap((r) =>
    r.status === "fulfilled" ? [r.value] : [],
  );
  const live = pages
    .flatMap((p) => p.items.map(toShopProduct))
    .map((p) => {
      const local = p.sourcing?.platform === "1688" ? localByOffer.get(p.sourcing.productId) : undefined;
      return local ? withLocalDetails(p, local) : p;
    })
    .filter((p) => matchesCollection(p, collection));
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
  const total = collection ? all.length : local.length + (pages[0]?.total ?? 0);
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
  filters: ShopCatalogueFilters,
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
  filters: ShopCatalogueFilters,
) {
  return useQuery({
    queryKey: ["shop", "combined-page", filters],
    queryFn: () => shopCataloguePage(filters),
  });
}
