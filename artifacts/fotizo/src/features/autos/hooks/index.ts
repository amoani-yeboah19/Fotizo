import { useQuery } from "@tanstack/react-query";
import { autosService } from "@/features/autos/services/autos.service";

export const useVehicles = () =>
  useQuery({ queryKey: ["vehicles"], queryFn: autosService.listVehicles });

export const useVehicle = (slug: string) =>
  useQuery({
    queryKey: ["vehicles", slug],
    queryFn: () => autosService.getVehicle(slug),
    enabled: Boolean(slug),
  });
