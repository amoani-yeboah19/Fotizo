import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { ordersService } from "@/features/payments/services";
import { bookingsService } from "@/features/bookings/services";
import { catalogService } from "@/features/marketplace/services";
import { dashboardService } from "@/features/profile/services";

// Keeps a dashboard's in-page section in sync with the ?tab= query param, so a
// section is deep-linkable (e.g. from the mobile menu). Falls back to `fallback`
// when the param is absent or not one of `valid`. Clicking an in-page pill still
// works — it just updates state without touching the URL.
export function useDashboardSection<T extends string>(valid: readonly T[], fallback: T) {
  const search = useSearch();
  const tab = new URLSearchParams(search).get("tab");
  const resolved = tab && (valid as readonly string[]).includes(tab) ? (tab as T) : null;

  const [section, setSection] = useState<T>(resolved ?? fallback);

  useEffect(() => {
    if (resolved) setSection(resolved);
  }, [resolved]);

  return [section, setSection] as const;
}

function useAccountQuery<T>(name: string, queryFn: () => Promise<T>) {
  const { user, isAuthenticated } = useAuth();
  return useQuery({ queryKey: [name, user?.id], queryFn, enabled: isAuthenticated });
}
export const useOrders = () => useAccountQuery("orders", ordersService.listOrders);
export const useSales = () => useAccountQuery("sales", ordersService.listSales);
export const useBookings = () => useAccountQuery("bookings", bookingsService.listBookings);
export const useSellerProducts = () => useAccountQuery("seller-products", catalogService.listSellerProducts);
export const useManagerMetrics = () => useAccountQuery("manager-metrics", dashboardService.getManagerMetrics);
export const useDeveloperStats = () => useAccountQuery("developer-stats", dashboardService.getDeveloperStats);
