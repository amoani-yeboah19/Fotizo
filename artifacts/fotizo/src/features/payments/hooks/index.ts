import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ordersService, type SaleStatus } from "@/features/payments/services/orders.service";
import type { ConfirmationQuote } from "@/types";

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

/** The buyer accepting or cancelling a confirmed (or pending) order. */
export const useOrderDecision = (orderId: string | null) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["order", user?.id, orderId] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  return {
    accept: useMutation({ mutationFn: () => ordersService.acceptQuote(orderId!), onSuccess: refresh }),
    withdraw: useMutation({ mutationFn: () => ordersService.withdrawOrder(orderId!), onSuccess: refresh }),
  };
};

export const useConfirmationQueue = (status = "open") =>
  useQuery({
    queryKey: ["confirmations", status],
    queryFn: () => ordersService.listConfirmations(status),
  });

/** Fotizo staff sending a confirmed quote or declining an order. */
export const useConfirmationActions = () => {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["confirmations"] });
  return {
    quote: useMutation({
      mutationFn: ({ orderId, quote }: { orderId: string; quote: ConfirmationQuote }) =>
        ordersService.sendQuote(orderId, quote),
      onSuccess: refresh,
    }),
    decline: useMutation({
      mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
        ordersService.declineOrder(orderId, reason),
      onSuccess: refresh,
    }),
  };
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
