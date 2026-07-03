import { api, USE_MOCKS } from "@/api";
import { delay } from "./mocks/delay";
import * as fx from "./mocks/fixtures";
import type { Order, PlaceOrderInput, OrderConfirmation } from "@/types";

export const ordersService = {
  async listOrders(): Promise<Order[]> {
    if (USE_MOCKS) {
      await delay();
      return fx.mockOrders;
    }
    return api.get<Order[]>("/orders");
  },

  async placeOrder(input: PlaceOrderInput): Promise<OrderConfirmation> {
    if (USE_MOCKS) {
      await delay(1500);
      return { orderId: `ord-${Date.now()}` };
    }
    return api.post<OrderConfirmation>("/orders", input);
  },
};
