import { useMutation } from "@tanstack/react-query";
import { ordersService } from "@/services";

export const usePlaceOrder = () =>
  useMutation({ mutationFn: ordersService.placeOrder });
