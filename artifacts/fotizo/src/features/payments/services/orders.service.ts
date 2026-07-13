import { api, ORDERS_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { Order, PlaceOrderInput, OrderConfirmation } from "@/types";

export const ordersService = {
  // Items the current user bought (their purchases).
  async listOrders(): Promise<Order[]> {
    if (ORDERS_USE_MOCKS) {
      await delay();
      return fx.mockOrders;
    }
    return api.get<Order[]>("/orders");
  },

  // Items bought FROM the current user (a seller's fulfilment queue).
  async listSales(): Promise<Order[]> {
    if (ORDERS_USE_MOCKS) {
      await delay();
      return fx.mockOrders;
    }
    return api.get<Order[]>("/sales");
  },

  async placeOrder(input: PlaceOrderInput): Promise<OrderConfirmation> {
    if (ORDERS_USE_MOCKS) {
      await delay(1500);
      return { orderId: `ord-${Date.now()}` };
    }
    return api.post<OrderConfirmation>("/orders", input);
  },
};
