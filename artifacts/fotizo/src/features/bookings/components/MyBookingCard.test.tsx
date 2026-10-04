// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MyBookingCard } from "./MyBookingCard";
import { bookingsService } from "../services";
import type { Booking } from "@/types";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1", role: "buyer" }, isAuthenticated: true }) }));
vi.mock("@/contexts/CurrencyContext", () => ({ useCurrency: () => ({ format: (n: number) => `£${n.toFixed(2)}` }) }));
vi.mock("wouter", () => ({ Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => <a href={href} className={className}>{children}</a> }));
vi.mock("../services", () => ({ bookingsService: { list: vi.fn(), listIncoming: vi.fn(), request: vi.fn(), changeStatus: vi.fn() } }));

const inThreeDays = new Date(Date.now() + 3 * 86_400_000);
inThreeDays.setHours(10, 30, 0, 0);
const booking: Booking = {
  id: "b1",
  reference: "FZB-ABC23456",
  serviceId: "s1",
  serviceTitle: "Home electrical inspection",
  provider: "Kofi Owusu",
  providerAvatar: "",
  buyer: "Ama",
  package: "Standard",
  price: 60,
  scheduledFor: inThreeDays.toISOString(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notes: "Please call when you arrive.",
  status: "confirmed",
  statusVersion: 2,
  providerNote: "I'll bring the testing kit.",
  meetingLink: "https://meet.example.com/abc",
  createdAt: new Date().toISOString(),
};

function mount(b: Booking = booking) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MyBookingCard booking={b} />
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("summarises the booking with its status, time and join link", () => {
  mount();
  expect(screen.getByText("Home electrical inspection")).toBeTruthy();
  expect(screen.getByText("Confirmed")).toBeTruthy();
  expect(screen.getByText(/In 3 days/)).toBeTruthy();
  expect(screen.getByText("Kofi Owusu · Standard")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Join/ }).getAttribute("href")).toBe("https://meet.example.com/abc");
});

it("shows every detail in the details view", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "View details" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("FZB-ABC23456")).toBeTruthy();
  expect(within(dialog).getByText("Please call when you arrive.")).toBeTruthy();
  expect(within(dialog).getByText("Message from Kofi Owusu")).toBeTruthy();
  expect(within(dialog).getByRole("list", { name: "Booking progress" }).textContent).toContain("Completed");
  expect(within(dialog).getByRole("link", { name: /View service/ }).getAttribute("href")).toBe("/services/s1");
});

it("asks before cancelling and sends the version it showed", async () => {
  vi.mocked(bookingsService.changeStatus).mockResolvedValue({ id: "b1", status: "cancelled", statusVersion: 3 });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
  expect(bookingsService.changeStatus).not.toHaveBeenCalled();
  expect(screen.getByText("Cancel this booking?")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Keep booking" }));
  expect(bookingsService.changeStatus).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
  const confirm = screen.getAllByRole("button", { name: "Cancel booking" }).at(-1)!;
  fireEvent.click(confirm);
  await waitFor(() =>
    expect(bookingsService.changeStatus).toHaveBeenCalledWith("b1", { status: "cancelled", expectedVersion: 2 }),
  );
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Booking cancelled" })));
});

it("offers no cancellation on closed bookings", () => {
  mount({ ...booking, status: "declined", meetingLink: null });
  expect(screen.getByText("Declined")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Cancel booking" })).toBeNull();
  expect(screen.queryByRole("link", { name: /Join/ })).toBeNull();
});
