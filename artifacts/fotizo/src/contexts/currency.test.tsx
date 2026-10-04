// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { CurrencyProvider, useCurrency } from "./CurrencyContext";
import { currencyService } from "@/services";
vi.mock("@/services", () => ({ currencyService: { getRates: vi.fn() } }));
function Probe() {
  const { currency, format, availableCurrencies, retryRates, ratesStatus } =
    useCurrency();
  return (
    <div>
      {currency.code}:{format(10)}:{availableCurrencies.length}
      <button onClick={retryRates}>Retry {ratesStatus}</button>
    </div>
  );
}
beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});
afterEach(cleanup);
it("shows GBP rather than inventing a conversion when rates fail", async () => {
  localStorage.setItem("fotizo_currency", "GHS");
  vi.mocked(currencyService.getRates).mockRejectedValue(new Error("offline"));
  render(
    <CurrencyProvider>
      <Probe />
    </CurrencyProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText(/GBP:/).textContent).toContain("10.00:1"),
  );
});
it("ignores unknown stored currencies and invalid rates", async () => {
  localStorage.setItem("fotizo_currency", "INVALID");
  vi.mocked(currencyService.getRates).mockResolvedValue({
    GBP: 1,
    USD: -1,
    GHS: 0,
  });
  render(
    <CurrencyProvider>
      <Probe />
    </CurrencyProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText(/GBP:/).textContent).toContain("10.00:1"),
  );
});
it("converts only with validated rates", async () => {
  localStorage.setItem("fotizo_currency", "USD");
  vi.mocked(currencyService.getRates).mockResolvedValue({
    GBP: 1,
    USD: 1.25,
    GHS: 15,
  });
  render(
    <CurrencyProvider>
      <Probe />
    </CurrencyProvider>,
  );
  await screen.findByText(/USD:\$12.50:3/);
});

it("recovers a saved currency after retrying failed rates", async () => {
  localStorage.setItem("fotizo_currency", "GHS");
  vi.mocked(currencyService.getRates)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ GBP: 1, USD: 1.25, GHS: 15 });
  render(
    <CurrencyProvider>
      <Probe />
    </CurrencyProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Retry error" }));
  await waitFor(() =>
    expect(screen.getByText(/GHS:/).textContent).toContain("GHS:₵150.00:3"),
  );
});
