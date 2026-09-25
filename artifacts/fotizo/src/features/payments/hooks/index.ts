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
