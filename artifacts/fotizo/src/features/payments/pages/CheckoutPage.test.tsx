// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import CheckoutPage from "./CheckoutPage";
import { ordersService } from "../services/orders.service";
import { ApiError } from "@/api/client";

const navigate = vi.hoisted(() => vi.fn());
const clearCart = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("wouter", () => ({ useLocation: () => ["/checkout", navigate] }));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    items: [{ id: "c1", productId: "p1", title: "Kettle", price: 20, image: "", seller: "Ama", quantity: 2 }],
    total: 40,
    isLoaded: true,
    clearCart,
  }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Kofi Boateng", email: "kofi@example.com" } }),
}));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ format: (n: number) => `£${n.toFixed(2)}` }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("../services/orders.service", () => ({
  ordersService: { placeOrder: vi.fn(), paymentConfig: vi.fn(), openCheckout: vi.fn() },
}));

function mount() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CheckoutPage />
    </QueryClientProvider>,
  );
}
function fillDelivery() {
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "0244000000" } });
  fireEvent.change(screen.getByLabelText("Address Line 1"), { target: { value: "12 Ring Road" } });
  fireEvent.change(screen.getByLabelText("City"), { target: { value: "Accra" } });
}
function toReview() {
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  fireEvent.click(screen.getByLabelText(/Mobile money/));
  fireEvent.click(screen.getByRole("button", { name: "Review Order" }));
}

const offlineOnly = { paystack: false, stripe: false };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(ordersService.paymentConfig).mockResolvedValue(offlineOnly);
});
afterEach(cleanup);

it("keeps the buyer on delivery details until required fields are filled", () => {
  mount();
  // Delivery fee applies at or below £50.
  expect(screen.getAllByText("£45.99").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  expect(screen.getAllByText("Required")).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "Review Order" })).toBeNull();
});

it("places the order with delivery, payment method and a reused retry key", async () => {
  vi.mocked(ordersService.placeOrder)
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce({
      orderId: "o1",
      reference: "FTZ-ABCDEFGH",
      subtotal: 40,
      shipping: 5.99,
      total: 45.99,
      paymentMethod: "mobile_money",
      paymentStatus: "unpaid",
    });
  mount();
  fillDelivery();
  toReview();
  expect(screen.getByText(/12 Ring Road/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Place Order/ }));
  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't place order" })),
  );
  fireEvent.click(screen.getByRole("button", { name: /Place Order/ }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/order-confirmation?order=o1"));
  const [first, second] = vi.mocked(ordersService.placeOrder).mock.calls.map((c) => c[0]);
  expect(first).toMatchObject({
    items: [{ productId: "p1", quantity: 2 }],
    paymentMethod: "mobile_money",
    delivery: { name: "Kofi Boateng", email: "kofi@example.com", city: "Accra", country: "GH" },
  });
  expect(second.idempotencyKey).toBe(first.idempotencyKey);
  expect(clearCart).toHaveBeenCalledTimes(1);
});

it("shows the server's reason when stock ran out", async () => {
  vi.mocked(ordersService.placeOrder).mockRejectedValue(
    new ApiError(409, "Conflict", { error: 'Only 1 of "Kettle" left. Update your cart and try again.' }, "/x"),
  );
  mount();
  fillDelivery();
  toReview();
  fireEvent.click(screen.getByRole("button", { name: /Place Order/ }));
  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Only 1 of "Kettle" left. Update your cart and try again.' }),
    ),
  );
  expect(clearCart).not.toHaveBeenCalled();
});

const placed = {
  orderId: "o2",
  reference: "FTZ-ONLINE01",
  subtotal: 40,
  shipping: 5.99,
  total: 45.99,
  paymentStatus: "unpaid" as const,
};

it("offers Paystack for Ghana, Stripe elsewhere, and sends the buyer to the payment page", async () => {
  vi.mocked(ordersService.paymentConfig).mockResolvedValue({ paystack: true, stripe: true });
  vi.mocked(ordersService.placeOrder).mockResolvedValue({
    ...placed,
    paymentMethod: "stripe",
    checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
  });
  mount();
  fillDelivery();
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  // Online payment is preselected once the providers are known.
  await waitFor(() => expect((screen.getByLabelText(/Pay online with Paystack/) as HTMLInputElement).checked).toBe(true));
  expect(screen.queryByLabelText(/Pay online by card/)).toBeNull();

  // Delivering to the UK switches the online option to Stripe.
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "GB" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  expect((screen.getByLabelText(/Pay online by card/) as HTMLInputElement).checked).toBe(true);
  expect(screen.queryByLabelText(/Paystack/)).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Review Order" }));
  fireEvent.click(screen.getByRole("button", { name: /Place Order & Pay/ }));
  await waitFor(() =>
    expect(ordersService.openCheckout).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_1"),
  );
  expect(vi.mocked(ordersService.placeOrder).mock.calls[0][0]).toMatchObject({
    paymentMethod: "stripe",
    delivery: { country: "GB" },
  });
  expect(clearCart).toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});

it("hides online payment when it isn't configured", async () => {
  mount();
  fillDelivery();
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  await waitFor(() => expect(ordersService.paymentConfig).toHaveBeenCalled());
  expect(screen.queryByLabelText(/Pay online/)).toBeNull();
  expect((screen.getByLabelText(/Pay on delivery/) as HTMLInputElement).checked).toBe(true);
});

it("keeps the order and explains when the payment page couldn't be opened", async () => {
  vi.mocked(ordersService.paymentConfig).mockResolvedValue({ paystack: true, stripe: true });
  vi.mocked(ordersService.placeOrder).mockResolvedValue({
    ...placed,
    paymentMethod: "paystack",
    checkoutUrl: null,
    paymentError: "The payment provider could not be reached. Try again shortly.",
  });
  mount();
  fillDelivery();
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  await screen.findByLabelText(/Pay online with Paystack/);
  fireEvent.click(screen.getByRole("button", { name: "Review Order" }));
  fireEvent.click(screen.getByRole("button", { name: /Place Order & Pay/ }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/order-confirmation?order=o2"));
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Order placed, payment not started" }));
  expect(ordersService.openCheckout).not.toHaveBeenCalled();
});
