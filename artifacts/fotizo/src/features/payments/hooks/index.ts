import { useMutation } from "@tanstack/react-query";
import { ordersService } from "@/features/payments/services";

export const usePlaceOrder = () =>
  useMutation({ mutationFn: ordersService.placeOrder });
