// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { CurrencyProvider, useCurrency } from "./CurrencyContext";
import { currencyService } from "@/services";
vi.mock("@/services", () => ({ currencyService: { getRates: vi.fn() } }));
function Probe() {
  const { currency, format, availableCurrencies } = useCurrency();
  return (
    <div>
      {currency.code}:{format(10)}:{availableCurrencies.length}
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
  await screen.findByText("USD:$12.50:3");
});
