import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  cataloguePages,
  type CatalogueFilters,
} from "@/features/marketplace/services/catalogue-page";
import { loadSourcedCatalogue } from "../data/sourced-catalogue";
import {
  offerOf,
  publishedOffers,
  toShopProduct,
  withLocalDetails,
} from "./shop.service";
import { isShopVisible } from "../data/shop-visibility";
import { matchesCollection } from "../data/shop-discovery";
export type ShopCatalogueFilters = CatalogueFilters;
// The most the catalogue API returns per page; larger requests are refused.
const SERVER_PAGE_SIZE_MAX = 48;
import type { ShopProduct } from "../data/shop-product";

// Temporary frontend sourcing overlay. Marketplace queries remain server-only.
// Apply frontend visibility exclusions before counting and pagination.
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
  const value =
    filters.category === "accessories" && !filters.collection
      ? Promise.all([
          cataloguePages.list("shop", filters),
          cataloguePages.list("shop", { ...filters, category: "jewellery" }),
        ]).then(([accessories, jewellery]) => ({
          ...accessories,
          items: [...accessories.items, ...jewellery.items],
          total: accessories.total + jewellery.total,
          hasMore: accessories.hasMore || jewellery.hasMore,
        }))
      : cataloguePages.list("shop", filters);
  serverPages.set(key, { at: Date.now(), value });
  value.catch(() => serverPages.delete(key));
  return value;
}

export async function shopCataloguePage(input: ShopCatalogueFilters = {}) {
  // The server filters collections too, so every filter is applied before paging.
  const filters =
    input.category === "jewellery"
      ? { ...input, category: "accessories" }
      : input;
  const { collection } = input;
  const page = filters.page ?? 0,
    pageSize = filters.pageSize ?? 48;
  const livePageSize = SERVER_PAGE_SIZE_MAX;
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
      isShopVisible(p) &&
      !published.has(offerOf(p.id) ?? "") &&
      matchesCollection(p, collection) &&
      !filters.sellerId &&
      !filters.inStock &&
      (!filters.category ||
        p.category === filters.category ||
        (filters.category === "accessories" && p.category === "jewellery")) &&
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
  // Only load enough of the sorted live prefix to fill this page. Keep reading
  // past excluded products, without waiting for the entire catalogue.
  const pageCount = Math.ceil(serverTotal / livePageSize);
  const responses = [...first];
  const target = (page + 1) * pageSize;
  const previewFillsPage =
    (!filters.sort || filters.sort === "newest") && imported.length >= target;
  let visible =
    first[0].status === "fulfilled"
      ? first[0].value.items.map(toShopProduct).filter(isShopVisible).length
      : 0;
  for (
    let start = 1;
    !previewFillsPage && visible < target && start < pageCount;
  ) {
    const batchSize = Math.min(
      4,
      pageCount - start,
      Math.max(1, Math.ceil((target - visible) / livePageSize)),
    );
    const batch = await Promise.allSettled(
      Array.from({ length: batchSize }, (_, i) =>
        serverPage({ ...filters, page: start + i, pageSize: livePageSize }),
      ),
    );
    responses.push(...batch);
    visible += batch.flatMap((r) =>
      r.status === "fulfilled"
        ? r.value.items.map(toShopProduct).filter(isShopVisible)
        : [],
    ).length;
    start += batchSize;
  }
  const pages = responses.flatMap((r) =>
    r.status === "fulfilled" ? [r.value] : [],
  );
  const live = pages
    .flatMap((p) => p.items.map(toShopProduct))
    .map((p) => {
      const local =
        p.sourcing?.platform === "1688"
          ? localByOffer.get(p.sourcing.productId)
          : undefined;
      return local ? withLocalDetails(p, local) : p;
    })
    .filter(isShopVisible);
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
  // The unfiltered opening catalogue leads with clothing while retaining every department.
  if ((!filters.sort || filters.sort === "newest") && !filters.category && !q) {
    const priority = (p: ShopProduct) =>
      p.category === "womens" ? 0 : p.category === "mens" ? 1 : 2;
    all.sort((a, b) => priority(a) - priority(b));
  }
  const loadedCount = pages.reduce((n, p) => n + p.items.length, 0);
  const total =
    local.length + Math.max(0, serverTotal - (loadedCount - live.length));
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
