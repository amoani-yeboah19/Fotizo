// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import OrderConfirmation from "./OrderConfirmationPage";
import { ordersService } from "../services/orders.service";
import type { OrderDetail } from "@/types";

vi.mock("wouter", () => ({
  useSearch: () => "order=o1&reference=FZP-123",
  useLocation: () => ["/order-confirmation", vi.fn()],
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ format: (n: number) => `£${n.toFixed(2)}` }),
}));
vi.mock("framer-motion", () => ({ motion: { div: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div> } }));
vi.mock("../services/orders.service", () => ({
  ordersService: { getOrder: vi.fn(), verifyPayment: vi.fn(), startPayment: vi.fn(), openCheckout: vi.fn() },
}));

const order = (patch: Partial<OrderDetail> = {}): OrderDetail => ({
  orderId: "o1",
  reference: "FTZ-ABCDEFGH",
  subtotal: 60,
  shipping: 0,
  total: 60,
  paymentMethod: "paystack",
  paymentStatus: "unpaid",
  createdAt: "2026-09-26T10:00:00Z",
  delivery: { name: "Ama", phone: "0244", addressLine1: "1 Road", addressLine2: "", city: "Accra", postalCode: "", country: "GH" },
  items: [],
  ...patch,
});

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OrderConfirmation />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it("confirms an online payment with the provider when the buyer returns", async () => {
  vi.mocked(ordersService.getOrder)
    .mockResolvedValueOnce(order())
    .mockResolvedValue(order({ paymentStatus: "paid" }));
  vi.mocked(ordersService.verifyPayment).mockResolvedValue({ paymentStatus: "paid", attemptStatus: "succeeded", orderOpen: true });
  mount();
  expect(await screen.findByText(/Your payment was received/)).toBeTruthy();
  expect(screen.getByText(/Paid$/)).toBeTruthy();
  expect(ordersService.verifyPayment).toHaveBeenCalledWith("o1");
  expect(screen.queryByRole("button", { name: /Pay Now/ })).toBeNull();
});

it("lets the buyer finish an unpaid online order", async () => {
  vi.mocked(ordersService.getOrder).mockResolvedValue(order());
  vi.mocked(ordersService.verifyPayment).mockResolvedValue({ paymentStatus: "unpaid", attemptStatus: "failed", orderOpen: true });
  vi.mocked(ordersService.startPayment).mockResolvedValue({ checkoutUrl: "https://checkout.paystack.com/abc" });
  mount();
  expect(await screen.findByText("Awaiting Payment")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Pay Now/ }));
  await waitFor(() => expect(ordersService.openCheckout).toHaveBeenCalledWith("https://checkout.paystack.com/abc"));
});

it("explains when an unpaid order was released", async () => {
  vi.mocked(ordersService.getOrder).mockResolvedValue(order());
  vi.mocked(ordersService.verifyPayment).mockResolvedValue({ paymentStatus: "unpaid", attemptStatus: "expired", orderOpen: false });
  mount();
  expect(await screen.findByText("Payment Not Completed")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Pay Now/ })).toBeNull();
});

it("does not contact a provider for offline orders", async () => {
  vi.mocked(ordersService.getOrder).mockResolvedValue(order({ paymentMethod: "pay_on_delivery" }));
  mount();
  expect(await screen.findByText("Order Placed!")).toBeTruthy();
  expect(ordersService.verifyPayment).not.toHaveBeenCalled();
});
