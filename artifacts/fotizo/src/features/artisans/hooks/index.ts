import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { artisansService } from "@/features/artisans/services";

export const useCreateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: artisansService.createService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
    },
  });
};

export const useServices = () =>
  useQuery({ queryKey: ["services"], queryFn: artisansService.listServices });

export const useService = (id: string) =>
  useQuery({
    queryKey: ["service", id],
    queryFn: () => artisansService.getService(id),
    enabled: !!id,
  });
