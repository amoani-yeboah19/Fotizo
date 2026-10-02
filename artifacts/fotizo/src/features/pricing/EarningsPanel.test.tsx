// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EarningsPanel, earningsService, type EarningsReport } from "./EarningsPanel";

vi.mock("@/api", async (original) => ({ ...(await original<typeof import("@/api")>()), AUTH_USE_MOCKS: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "s1", role: "seller" } }) }));
vi.spyOn(earningsService, "get");

// Testing Library normalises the page text's non-breaking spaces; match that.
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount).replace(/\s/g, " ");

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <EarningsPanel />
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.mocked(earningsService.get).mockReset();
});

it("shows gross, fees and net in each transaction currency without converting them", async () => {
  const report: EarningsReport = {
    collectionActive: false,
    totals: [
      { currency: "GBP", gross: 60, fees: 3, net: 57, count: 1 },
      { currency: "GHS", gross: 600, fees: 2, net: 598, count: 1 },
    ],
    items: [
      { id: "f1", kind: "unit_sale", reference: "FTZ-A", title: "Cordless drill", quantity: 3, currency: "GBP", gross: 60, fee: 3, net: 57, status: "pending", createdAt: "2026-10-01T10:00:00Z" },
      { id: "f2", kind: "booking", reference: "FZB-B", title: "Website build", quantity: 1, currency: "GHS", gross: 600, fee: 2, net: 598, status: "pending", createdAt: "2026-10-01T09:00:00Z" },
    ],
  };
  vi.mocked(earningsService.get).mockResolvedValue(report);
  mount();
  const cedis = await screen.findByLabelText("Earnings in GHS");
  expect(within(cedis).getByText(money(600, "GHS"))).toBeTruthy();
  expect(within(cedis).getByText(`−${money(2, "GHS")}`)).toBeTruthy();
  expect(within(cedis).getByText(money(598, "GHS"))).toBeTruthy();
  expect(within(screen.getByLabelText("Earnings in GBP")).getByText(money(57, "GBP"))).toBeTruthy();
  expect(screen.getByText("Sale × 3 · FTZ-A")).toBeTruthy();
  expect(screen.getByText("Booking · FZB-B")).toBeTruthy();
  expect(screen.getAllByText("Not yet collected")).toHaveLength(2);
  expect(screen.getByText(/Collection hasn't started yet/)).toBeTruthy();
});

it("explains when there is nothing yet", async () => {
  vi.mocked(earningsService.get).mockResolvedValue({ collectionActive: false, totals: [], items: [] });
  mount();
  expect(await screen.findByText("No earnings yet")).toBeTruthy();
});
