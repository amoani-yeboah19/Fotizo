import { api, ORDERS_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { Order, OrderDetail, PlaceOrderInput, OrderConfirmation } from "@/types";

export type SaleStatus = "processing" | "shipped" | "delivered" | "cancelled";

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

  // Orders are paid offline (on delivery, mobile money or bank transfer); the
  // server prices the cart and reserves stock. Demo builds cannot place orders.
  async placeOrder(input: PlaceOrderInput): Promise<OrderConfirmation> {
    if (ORDERS_USE_MOCKS) throw new Error("Ordering is unavailable in demo mode.");
    return api.post<OrderConfirmation>("/orders", input);
  },

  async getOrder(id: string): Promise<OrderDetail> {
    return api.get<OrderDetail>(`/orders/${id}`);
  },

  async updateSaleStatus(lineId: string, status: SaleStatus, trackingNumber?: string) {
    return api.post<{ id: string; status: string }>(`/sales/${lineId}/status`, {
      status,
      ...(trackingNumber ? { trackingNumber } : {}),
    });
  },

  async markPaid(orderId: string) {
    return api.post<{ id: string; paymentStatus: string }>(`/operations/orders/${orderId}/payment`, {
      status: "paid",
    });
  },
};
