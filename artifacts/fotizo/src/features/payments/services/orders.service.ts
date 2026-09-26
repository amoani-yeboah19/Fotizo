import { api, ORDERS_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type {
  OnlinePaymentMethod,
  Order,
  OrderDetail,
  PlaceOrderInput,
  OrderConfirmation,
  PaymentVerification,
} from "@/types";

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

  // The server prices the cart and reserves stock. Online orders come back with
  // the provider's payment page to send the buyer to. Demo builds cannot order.
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

  /** Which online providers this deployment has configured. */
  async paymentConfig(): Promise<Record<OnlinePaymentMethod, boolean>> {
    if (ORDERS_USE_MOCKS) return { paystack: false, stripe: false };
    return api.get<Record<OnlinePaymentMethod, boolean>>("/payments/config");
  },

  /** Opens (or reopens) the payment page for an unpaid online order. */
  async startPayment(orderId: string) {
    return api.post<{ checkoutUrl: string }>(`/payments/orders/${orderId}/start`, {});
  },

  /** Leaves the app for the provider's hosted payment page. */
  openCheckout(url: string) {
    window.location.assign(url);
  },

  /** Asks the server to confirm payment with the provider after checkout. */
  async verifyPayment(orderId: string) {
    return api.post<PaymentVerification>(`/payments/orders/${orderId}/verify`, {});
  },

  async markPaid(orderId: string) {
    return api.post<{ id: string; paymentStatus: string }>(`/operations/orders/${orderId}/payment`, {
      status: "paid",
    });
  },
};
