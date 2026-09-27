import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ordersService, type SaleStatus } from "@/features/payments/services/orders.service";

export const usePlaceOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ordersService.placeOrder,
    onSuccess: () => {
      // The buyer's purchases now include this order and marketplace stock
      // dropped — refresh both so the UI reflects it immediately.
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["seller-products"] });
    },
  });
};

export const usePaymentConfig = () =>
  useQuery({
    queryKey: ["payment-config"],
    queryFn: ordersService.paymentConfig,
    staleTime: 5 * 60 * 1000,
  });

/**
 * On return from Paystack or Stripe, confirms the payment with the provider.
 * Checks again a few times while the provider is still settling it.
 */
export const useVerifyPayment = (orderId: string | null, enabled: boolean) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["payment-verify", user?.id, orderId],
    queryFn: async () => {
      const result = await ordersService.verifyPayment(orderId!);
      if (result.paymentStatus === "paid") qc.invalidateQueries({ queryKey: ["order", user?.id, orderId] });
      return result;
    },
    enabled: Boolean(orderId && user && enabled),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.paymentStatus === "unpaid" &&
      query.state.data.attemptStatus === "pending" &&
      query.state.dataUpdateCount < 5
        ? 3000
        : false,
  });
};

export const useOrderDetail = (id: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["order", user?.id, id],
    queryFn: () => ordersService.getOrder(id!),
    enabled: Boolean(id && user),
  });
};

/** Seller fulfilment: move one order line forward. */
export const useUpdateSaleStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, trackingNumber }: { id: string; status: SaleStatus; trackingNumber?: string }) =>
      ordersService.updateSaleStatus(id, status, trackingNumber),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["seller-products"] });
    },
  });
};
