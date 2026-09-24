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
vi.mock("../services/orders.service", () => ({ ordersService: { placeOrder: vi.fn() } }));

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

beforeEach(() => vi.resetAllMocks());
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
