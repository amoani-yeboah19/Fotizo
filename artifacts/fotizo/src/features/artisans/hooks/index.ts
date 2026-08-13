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

// Omit the filter to get every listing — the services page needs the full set
// to show per-group counts, so it narrows in memory. Pass a filter when you
// only care about one slice (e.g. a group landing page) and the narrowing
// should happen server-side.
export const useServices = (filter?: { group?: string; category?: string }) =>
  useQuery({
    queryKey: ["services", filter?.group ?? "all", filter?.category ?? "all"],
    queryFn: () => artisansService.listServices(filter),
  });

export const useService = (id: string) =>
  useQuery({
    queryKey: ["service", id],
    queryFn: () => artisansService.getService(id),
    enabled: !!id,
  });
