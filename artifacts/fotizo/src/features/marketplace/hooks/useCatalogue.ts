import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  cataloguePages,
  type CatalogueChannel,
  type CatalogueFilters,
} from "../services/catalogue-page";
export function useCataloguePage(
  channel: CatalogueChannel,
  filters: CatalogueFilters,
) {
  return useQuery({
    queryKey: [channel === "shop" ? "shop" : "products", "page", filters],
    queryFn: () => cataloguePages.list(channel, filters),
  });
}
export function useCatalogueCategories(channel: CatalogueChannel) {
  return useQuery({
    queryKey: [channel === "shop" ? "shop" : "products", "categories"],
    queryFn: () => cataloguePages.categories(channel),
  });
}
/** Consecutive server pages for grid pages that keep appending as you scroll. */
export function useCatalogueInfinite(
  channel: CatalogueChannel,
  filters: Omit<CatalogueFilters, "page" | "pageSize">,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: [channel === "shop" ? "shop" : "products", "infinite", filters],
    queryFn: ({ pageParam }) =>
      cataloguePages.list(channel, { ...filters, page: pageParam, pageSize: 48 }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled,
  });
}
