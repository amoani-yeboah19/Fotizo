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
  ordersService: {
    getOrder: vi.fn(), verifyPayment: vi.fn(), startPayment: vi.fn(), openCheckout: vi.fn(),
    acceptQuote: vi.fn(), withdrawOrder: vi.fn(),
  },
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
  confirmationStatus: null,
  confirmationNote: null,
  deliveryDaysMin: null,
  deliveryDaysMax: null,
  quoteExpiresAt: null,
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

const bagLine = {
  id: "l1", orderId: "o1", reference: "FTZ-ABCDEFGH", paymentStatus: "unpaid" as const, paymentMethod: "paystack" as const,
  productId: "p1", productTitle: "Waist bag", productImage: "", seller: "Fotizo Shop", price: 2.5, quantity: 4,
  status: "pending", date: "2026-09-26", trackingNumber: null, needsConfirmation: true,
  requestedOptions: "Black", confirmedOptions: "Black, adjustable strap", estimatedPrice: 1.95,
};

it("holds an order with imported items for confirmation without opening payment", async () => {
  vi.mocked(ordersService.getOrder).mockResolvedValue(
    order({ confirmationStatus: "awaiting", items: [{ ...bagLine, price: 1.95, confirmedOptions: null, confirmationStatus: "awaiting" }] }),
  );
  vi.mocked(ordersService.withdrawOrder).mockResolvedValue(order({ confirmationStatus: "withdrawn" }));
  mount();
  expect(await screen.findByText("Confirming Your Items")).toBeTruthy();
  expect(screen.getByText("Estimated total")).toBeTruthy();
  expect(screen.getByText("Requested: Black")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Pay Now|Accept/ })).toBeNull();
  expect(ordersService.verifyPayment).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel Request" }));
  await waitFor(() => expect(ordersService.withdrawOrder).toHaveBeenCalledWith("o1"));
});

it("shows the confirmed quote and sends the buyer to pay when they accept", async () => {
  vi.mocked(ordersService.getOrder).mockResolvedValue(
    order({
      confirmationStatus: "quoted",
      confirmationNote: "Small-order surcharge applies.",
      subtotal: 10,
      shipping: 12,
      total: 22,
      deliveryDaysMin: 12,
      deliveryDaysMax: 20,
      quoteExpiresAt: "2026-10-03T10:00:00Z",
      items: [{ ...bagLine, confirmationStatus: "quoted" }],
    }),
  );
  vi.mocked(ordersService.acceptQuote).mockResolvedValue({
    ...order({ confirmationStatus: "accepted" }),
    checkoutUrl: "https://checkout.paystack.com/quote",
  });
  mount();
  expect(await screen.findByText("Your Order Is Confirmed")).toBeTruthy();
  expect(screen.getByText("Small-order surcharge applies.")).toBeTruthy();
  expect(screen.getByText("Confirmed: Black, adjustable strap")).toBeTruthy();
  expect(screen.getByText("12–20 days")).toBeTruthy();
  expect(
    screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "£2.50 each (estimated £1.95)"),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Accept & Pay/ }));
  await waitFor(() => expect(ordersService.openCheckout).toHaveBeenCalledWith("https://checkout.paystack.com/quote"));
});

it("explains a declined order with Fotizo's reason", async () => {
  vi.mocked(ordersService.getOrder).mockResolvedValue(
    order({ confirmationStatus: "declined", confirmationNote: "The supplier discontinued this item." }),
  );
  mount();
  expect(await screen.findByText("We Couldn't Supply This Order")).toBeTruthy();
  expect(screen.getByText("The supplier discontinued this item.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Accept|Pay Now/ })).toBeNull();
});
