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

// Purchases — items the current user bought.
export const useOrders = () =>
  useQuery({ queryKey: ["orders"], queryFn: ordersService.listOrders });

// Sales — items bought from the current user (seller fulfilment queue).
export const useSales = () =>
  useQuery({ queryKey: ["sales"], queryFn: ordersService.listSales });

export const useBookings = () =>
  useQuery({ queryKey: ["bookings"], queryFn: bookingsService.listBookings });

export const useSellerProducts = () =>
  useQuery({ queryKey: ["seller-products"], queryFn: catalogService.listSellerProducts });

export const useManagerMetrics = () =>
  useQuery({ queryKey: ["manager-metrics"], queryFn: dashboardService.getManagerMetrics });

export const useDeveloperStats = () =>
  useQuery({ queryKey: ["developer-stats"], queryFn: dashboardService.getDeveloperStats });
