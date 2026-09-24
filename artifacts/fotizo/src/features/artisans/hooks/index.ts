import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { artisansService } from "@/features/artisans/services";
import { useAuth } from "@/contexts/AuthContext";
import type { NewServiceInput } from "@/types";

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

// The signed-in provider's own listings, scoped to the account.
export const useMyServices = () => {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["my-services", user?.id],
    queryFn: artisansService.listMyServices,
    enabled: isAuthenticated,
  });
};

export const useMyService = (id: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-services", user?.id, id],
    queryFn: () => artisansService.getMyService(id!),
    enabled: Boolean(id && user),
  });
};

const refreshServices = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["services"] });
  qc.invalidateQueries({ queryKey: ["service"] });
  qc.invalidateQueries({ queryKey: ["my-services"] });
};

export const useUpdateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: NewServiceInput }) => artisansService.updateService(id, input),
    onSuccess: () => refreshServices(qc),
  });
};

export const useSetServiceStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "unpublished" }) =>
      artisansService.setServiceStatus(id, status),
    onSuccess: () => refreshServices(qc),
  });
};

export const useService = (id: string) =>
  useQuery({
    queryKey: ["service", id],
    queryFn: () => artisansService.getService(id),
    enabled: !!id,
  });
