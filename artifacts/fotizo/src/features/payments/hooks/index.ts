import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersService } from "@/features/payments/services";

export const usePlaceOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ordersService.placeOrder,
    onSuccess: () => {
      // The buyer's purchases now include this order, and stock dropped for the
      // items bought — refresh both so the UI reflects it immediately.
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["seller-products"] });
    },
  });
};
