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
const kettle = { id: "c1", productId: "p1", title: "Kettle", price: 20, image: "", seller: "Ama", quantity: 2 };
const cart = vi.hoisted(() => ({ items: [] as Record<string, unknown>[] }));
vi.mock("wouter", () => ({ useLocation: () => ["/checkout", navigate] }));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    items: cart.items,
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
async function toReview() {
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  await waitFor(() => expect(screen.getByLabelText(/Payaza/)).toHaveProperty("disabled", false));
  fireEvent.click(screen.getByRole("button", { name: "Review Order" }));
}

const offlineOnly = { payaza: true };
// Orders that need no supplier confirmation (marketplace goods only).
const unconfirmed = { confirmationStatus: null, confirmationNote: null, deliveryDaysMin: null, deliveryDaysMax: null, quoteExpiresAt: null };
beforeEach(() => {
  vi.resetAllMocks();
  cart.items = [kettle];
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
      paymentMethod: "payaza",
      paymentStatus: "unpaid",
      ...unconfirmed,
    });
  mount();
  fillDelivery();
  await toReview();
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
    paymentMethod: "payaza",
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
  await toReview();
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
  ...unconfirmed,
};

it("offers only Payaza for Ghana and international deliveries", async () => {
  vi.mocked(ordersService.placeOrder).mockResolvedValue({ ...placed, paymentMethod: "payaza", checkoutUrl: "/payaza-checkout?order=o2&attempt=a1" });
  mount(); fillDelivery();
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  await waitFor(() => expect(screen.getByLabelText(/Payaza/)).toHaveProperty("disabled", false));
  expect(screen.getAllByRole("radio")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "US" } });
  await toReview();
  fireEvent.click(screen.getByRole("button", { name: /Place Order & Pay/ }));
  await waitFor(() => expect(ordersService.openCheckout).toHaveBeenCalledWith("/payaza-checkout?order=o2&attempt=a1"));
  expect(vi.mocked(ordersService.placeOrder).mock.calls[0][0]).toMatchObject({ paymentMethod: "payaza", delivery: { country: "US" } });
});
it("blocks checkout when Payaza is unavailable without an offline fallback", async () => {
  vi.mocked(ordersService.paymentConfig).mockResolvedValue({ payaza: false });
  mount(); fillDelivery();
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  await waitFor(() => expect(ordersService.paymentConfig).toHaveBeenCalled());
  expect(screen.getByLabelText(/Payaza/)).toHaveProperty("disabled", true);
  expect(screen.getByRole("button", { name: "Review Order" })).toHaveProperty("disabled", true);
  expect(screen.queryByLabelText(/Pay on delivery|Stripe|Paystack/)).toBeNull();
});

it("keeps the order and explains when the payment page couldn't be opened", async () => {
  vi.mocked(ordersService.paymentConfig).mockResolvedValue({ payaza: true });
  vi.mocked(ordersService.placeOrder).mockResolvedValue({
    ...placed,
    paymentMethod: "payaza",
    checkoutUrl: null,
    paymentError: "The payment provider could not be reached. Try again shortly.",
  });
  mount();
  fillDelivery();
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  await waitFor(() => expect(screen.getByLabelText(/Payaza/)).toHaveProperty("disabled", false));
  fireEvent.click(screen.getByRole("button", { name: "Review Order" }));
  fireEvent.click(screen.getByRole("button", { name: /Place Order & Pay/ }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/order-confirmation?order=o2"));
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Order placed, payment not started" }));
  expect(ordersService.openCheckout).not.toHaveBeenCalled();
});

it("asks for options on imported items and requests confirmation instead of charging the estimate", async () => {
  cart.items = [
    { ...kettle, needsConfirmation: true, minimumOrder: "20 pieces", title: "Waist bag" },
  ];
  vi.mocked(ordersService.paymentConfig).mockResolvedValue({ payaza: true });
  vi.mocked(ordersService.placeOrder).mockResolvedValue({
    ...placed,
    paymentMethod: "payaza",
    ...unconfirmed,
    confirmationStatus: "awaiting",
  });
  mount();
  fillDelivery();
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payment" }));
  await waitFor(() => expect(screen.getByLabelText(/Payaza/)).toHaveProperty("disabled", false));
  expect(screen.getByText(/once you accept the confirmed total/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Review Order" }));
  expect(screen.getByText("Imported items are confirmed before you pay")).toBeTruthy();
  expect(screen.getByText(/Supplier minimum order: 20 pieces/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Options you want (optional)"), { target: { value: " Black " } });
  fireEvent.click(screen.getByRole("button", { name: /Request Confirmation/ }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/order-confirmation?order=o2"));
  expect(vi.mocked(ordersService.placeOrder).mock.calls[0][0].items).toEqual([
    { productId: "p1", quantity: 2, options: "Black" },
  ]);
  expect(ordersService.openCheckout).not.toHaveBeenCalled();
});
