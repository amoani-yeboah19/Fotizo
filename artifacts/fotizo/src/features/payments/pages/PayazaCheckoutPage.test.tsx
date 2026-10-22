// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import PayazaCheckoutPage from "./PayazaCheckoutPage";
const mocks = vi.hoisted(() => ({ get: vi.fn(), navigate: vi.fn(), load: vi.fn(), setup: vi.fn(), show: vi.fn(), callback: vi.fn(), close: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/payaza-checkout", mocks.navigate] }));
vi.mock("@/api", () => ({ api: { get: mocks.get }, apiErrorMessage: (_e: unknown, fallback: string) => fallback }));
vi.mock("../services/payaza", () => ({ loadPayaza: mocks.load }));
vi.mock("@/components/layout/PageLayout", () => ({ PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState({}, "", "/payaza-checkout?order=o1&attempt=a1");
  mocks.get.mockResolvedValue({ checkout_amount: 900, currency_code: "GHS", transaction_reference: "ref" });
  mocks.load.mockResolvedValue(undefined);
  mocks.setup.mockReturnValue({ setCallback: mocks.callback, setOnClose: mocks.close, showPopup: mocks.show });
  window.PayazaCheckout = { setup: mocks.setup };
});
afterEach(cleanup);
it("uses server checkout settings and returns to verification after the SDK callback", async () => {
  render(<PayazaCheckoutPage />);
  await screen.findByText("GHS 900.00");
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payaza" }));
  await waitFor(() => expect(mocks.show).toHaveBeenCalledOnce());
  expect(mocks.get).toHaveBeenCalledWith("/payments/orders/o1/checkout/a1");
  expect(mocks.setup).toHaveBeenCalledWith(expect.objectContaining({ checkout_amount: 900, transaction_reference: "ref" }));
  mocks.callback.mock.calls[0][0]({ type: "success" });
  expect(mocks.navigate).toHaveBeenCalledWith("/order-confirmation?order=o1");
});
it("shows SDK loading failure and allows retry", async () => {
  mocks.load.mockRejectedValueOnce(new Error("Unable to load Payaza"));
  render(<PayazaCheckoutPage />); await screen.findByText("GHS 900.00");
  fireEvent.click(screen.getByRole("button", { name: "Continue to Payaza" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Unable to load Payaza");
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Continue to Payaza" })).toHaveProperty("disabled", false);
});
it("does not open the SDK when server checkout authorization fails", async () => {
  mocks.get.mockRejectedValue(new Error("Forbidden"));
  render(<PayazaCheckoutPage />); await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Continue to Payaza" })).toHaveProperty("disabled", true);
  expect(mocks.setup).not.toHaveBeenCalled();
});
