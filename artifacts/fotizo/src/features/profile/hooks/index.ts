import { useQuery } from "@tanstack/react-query";
import { ordersService } from "@/features/payments/services";
import { bookingsService } from "@/features/bookings/services";
import { catalogService } from "@/features/marketplace/services";
import { dashboardService } from "@/features/profile/services";

export const useOrders = () =>
  useQuery({ queryKey: ["orders"], queryFn: ordersService.listOrders });

export const useBookings = () =>
  useQuery({ queryKey: ["bookings"], queryFn: bookingsService.listBookings });

export const useSellerProducts = () =>
  useQuery({ queryKey: ["seller-products"], queryFn: catalogService.listSellerProducts });

export const useManagerMetrics = () =>
  useQuery({ queryKey: ["manager-metrics"], queryFn: dashboardService.getManagerMetrics });

export const useDeveloperStats = () =>
  useQuery({ queryKey: ["developer-stats"], queryFn: dashboardService.getDeveloperStats });
