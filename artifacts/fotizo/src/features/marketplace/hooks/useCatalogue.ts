import { useQuery } from "@tanstack/react-query";
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
