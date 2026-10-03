// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConfirmationQueue } from "./ConfirmationQueue";
import type { ConfirmationRequest } from "@/types";

const quote = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
const decline = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
const queue = vi.hoisted(() => ({ data: [] as ConfirmationRequest[] }));
vi.mock("@/features/payments/hooks", () => ({
  useConfirmationQueue: () => ({ data: queue.data, isLoading: false, isError: false }),
  useConfirmationActions: () => ({ quote, decline }),
}));

const line = {
  orderId: "o1", reference: "FTZ-ABCDEFGH", paymentStatus: "unpaid" as const, paymentMethod: "paystack" as const,
  productImage: "", date: "2026-10-01", trackingNumber: null, status: "pending", confirmationStatus: "awaiting" as const,
};
const request: ConfirmationRequest = {
  orderId: "o1",
  reference: "FTZ-ABCDEFGH",
  subtotal: 27.8,
  shipping: 5.99,
  total: 33.79,
  paymentMethod: "paystack",
  paymentStatus: "unpaid",
  confirmationStatus: "awaiting",
  confirmationNote: null,
  deliveryDaysMin: null,
  deliveryDaysMax: null,
  quoteExpiresAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  quotedAt: null,
  buyer: { name: "Ama", email: "ama@example.com", phone: "0244000000" },
  delivery: { city: "Accra", country: "GH" },
  items: [
    {
      ...line, id: "l1", productId: "p1", productTitle: "Waist bag", seller: "Fotizo Shop", price: 1.95, quantity: 4,
      needsConfirmation: true, requestedOptions: "Black", confirmedOptions: null, estimatedPrice: 1.95,
      supplier: {
        platform: "alibaba", productId: "16", sourceUrl: "https://www.alibaba.com/product-detail/_16.html",
        priceRange: "US $1.98-$2.98", minimumOrder: "20 pieces", unit: "piece", supplierCurrency: "USD", supplierCost: 1.98, supplierRate: 1.32,
      },
    },
    {
      ...line, id: "l2", productId: "p2", productTitle: "Kettle", seller: "Ama Stores", price: 20, quantity: 1,
      needsConfirmation: false, requestedOptions: null, confirmedOptions: null, estimatedPrice: null, supplier: null,
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  queue.data = [request];
});
afterEach(cleanup);

it("shows the supplier's terms and sends a confirmed quote for the imported lines only", async () => {
  render(<ConfirmationQueue />);
  expect(screen.getByText(/minimum 20 pieces/)).toBeTruthy();
  expect(screen.getByRole("link", { name: /alibaba listing/ }).getAttribute("href")).toBe("https://www.alibaba.com/product-detail/_16.html");
  expect(screen.getByText(/marketplace item, price fixed/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Confirmed price each (GBP)"), { target: { value: "2.50" } });
  fireEvent.change(screen.getByLabelText("Delivery fee (GBP)"), { target: { value: "12" } });
  // Delivery time is required before a quote can go out.
  fireEvent.click(screen.getByRole("button", { name: "Send confirmed quote" }));
  expect(screen.getByRole("alert").textContent).toMatch(/delivery time/);
  fireEvent.change(screen.getByLabelText("Delivery from (days)"), { target: { value: "12" } });
  fireEvent.change(screen.getByLabelText("Delivery to (days)"), { target: { value: "20" } });
  // 4 x 2.50 + 20 + 12 delivery.
  expect(screen.getByText("£42.00")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Send confirmed quote" }));
  await waitFor(() =>
    expect(quote.mutateAsync).toHaveBeenCalledWith({
      orderId: "o1",
      quote: {
        items: [{ id: "l1", price: 2.5, confirmedOptions: "Black" }],
        shipping: 12,
        deliveryDaysMin: 12,
        deliveryDaysMax: 20,
      },
    }),
  );
});

it("declines with a reason for the buyer", async () => {
  render(<ConfirmationQueue />);
  fireEvent.click(screen.getByRole("button", { name: "Decline" }));
  fireEvent.change(screen.getByLabelText("Why can't this order be supplied?"), {
    target: { value: "The supplier discontinued this bag." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Decline order" }));
  await waitFor(() =>
    expect(decline.mutateAsync).toHaveBeenCalledWith({ orderId: "o1", reason: "The supplier discontinued this bag." }),
  );
});

it("says when nothing is waiting", () => {
  queue.data = [];
  render(<ConfirmationQueue />);
  expect(screen.getByText("No orders are waiting for confirmation.")).toBeTruthy();
});
