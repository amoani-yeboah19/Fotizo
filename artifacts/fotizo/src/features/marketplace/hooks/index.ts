import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogService } from "@/features/marketplace/services";

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: catalogService.createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["seller-products"] });
    },
  });
};

export const useProducts = () =>
  useQuery({ queryKey: ["products"], queryFn: catalogService.listProducts });

export const useProduct = (id: string) =>
  useQuery({
    queryKey: ["product", id],
    queryFn: () => catalogService.getProduct(id),
    enabled: !!id,
  });

export const useRelatedProducts = (id: string) =>
  useQuery({
    queryKey: ["product", id, "related"],
    queryFn: () => catalogService.getRelatedProducts(id),
    enabled: !!id,
  });

export const useCategories = () =>
  useQuery({ queryKey: ["categories"], queryFn: catalogService.listCategories });
