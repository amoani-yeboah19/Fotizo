import { useQuery } from "@tanstack/react-query";
import { shopService } from "@/features/shop/services";
export const useShopRelatedProducts = (id: string) =>
  useQuery({
    queryKey: ["shop", "related", id],
    queryFn: () => shopService.relatedProducts(id),
    enabled: !!id,
  });
export const useShopProduct = (id: string) =>
  useQuery({
    queryKey: ["shop", "product", id],
    queryFn: () => shopService.getProduct(id),
    enabled: !!id,
  });
