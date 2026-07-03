import { useQuery } from "@tanstack/react-query";
import { artisansService } from "@/services";

export const useServices = () =>
  useQuery({ queryKey: ["services"], queryFn: artisansService.listServices });

export const useService = (id: string) =>
  useQuery({
    queryKey: ["service", id],
    queryFn: () => artisansService.getService(id),
    enabled: !!id,
  });
