import { useQuery } from "@tanstack/react-query";
import { shopService } from "@/features/shop/services";

// The whole catalogue in one cached query. Every shop surface (grid, deal
// strip, department counts, related items) derives from this one list, so
// they can never disagree with each other.
export const useShopProducts = () =>
  useQuery({ queryKey: ["shop", "products"], queryFn: shopService.listProducts });

export const useShopProduct = (id: string) =>
  useQuery({
    queryKey: ["shop", "product", id],
    queryFn: () => shopService.getProduct(id),
    enabled: !!id,
  });
