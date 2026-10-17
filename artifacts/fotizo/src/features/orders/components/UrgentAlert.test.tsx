// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Order } from "@/types";
import { ApiError } from "@/api";
import { UrgentAlert } from "./UrgentAlert";

const sendUrgent = vi.hoisted(() => vi.fn());
vi.mock("@/features/payments/services/orders.service", () => ({ ordersService: { sendUrgent } }));

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
const line = (patch: Partial<Order>): Order => ({
  id: "line-1",
  orderId: "order-1",
  reference: "FTZ-1",
  paymentStatus: "paid",
  paymentMethod: "paystack",
  productId: "p1",
  productTitle: "Desk lamp",
  productImage: "",
  seller: "Ama Home",
  price: 20,
  quantity: 1,
  status: "processing",
  date: "2026-10-01",
  trackingNumber: null,
  ...patch,
});
const show = (order: Order) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UrgentAlert order={order} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  sendUrgent.mockReset();
});
afterEach(cleanup);

it("says when the order is expected before its delivery date, with no button", () => {
  show(line({ deliveryDue: iso(2), urgentAvailableAt: iso(2) }));
  expect(screen.getByText(/Expected by/)).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});

it("sends an urgent alert once overdue, then says when the next one is allowed", async () => {
  sendUrgent.mockResolvedValue({ sentAt: iso(0), urgentAvailableAt: iso(1), delivered: true });
  show(line({ deliveryDue: iso(-2), urgentAvailableAt: iso(-2) }));
  fireEvent.click(screen.getByRole("button", { name: "Send urgent alert" }));
  expect((await screen.findByRole("status")).textContent).toMatch(/Urgent alert sent to Ama Home\. You can send another after/);
  expect(sendUrgent).toHaveBeenCalledWith("line-1");
  expect(screen.queryByRole("button", { name: "Send urgent alert" })).toBeNull();
});

it("tells the buyer when nobody could be reached right away", async () => {
  sendUrgent.mockResolvedValue({ sentAt: iso(0), urgentAvailableAt: iso(1), delivered: false });
  show(line({ deliveryDue: iso(-2), urgentAvailableAt: iso(-2), needsConfirmation: true }));
  fireEvent.click(screen.getByRole("button", { name: "Send urgent alert" }));
  expect((await screen.findByRole("status")).textContent).toMatch(/sent to Fotizo\. They'll see it when they next sign in/);
});

it("waits out the day after the last alert", () => {
  show(line({ deliveryDue: iso(-3), urgentAvailableAt: iso(0.5), lastUrgentAt: iso(-0.5) }));
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByRole("status").textContent).toMatch(/You can send another after/);
});

it("shows the server's reason when an alert is refused", async () => {
  sendUrgent.mockImplementation(async () => {
    throw new ApiError(429, "Too Many Requests", { error: "You've already sent an urgent alert for this order today." }, "/orders/lines/line-1/urgent");
  });
  show(line({ deliveryDue: iso(-2), urgentAvailableAt: iso(-2) }));
  fireEvent.click(screen.getByRole("button", { name: "Send urgent alert" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/already sent an urgent alert/);
});

it("shows nothing once delivered or cancelled", () => {
  const { container } = show(line({ status: "delivered", deliveryDue: iso(-2), urgentAvailableAt: null }));
  expect(container.textContent).toBe("");
});
