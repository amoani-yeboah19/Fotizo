// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PackageChoices } from "./ServiceOfferPreview";
vi.mock("@/components/common/Price", () => ({ Price: ({ amount }: { amount: number }) => <span>£{amount}</span> }));
afterEach(cleanup);
it("changes the scope, price and booking action together when a buyer selects a tier", () => {
  render(<PackageChoices packages={[
    { name: "Starter", price: 50, delivery: "3 days", description: "One page", revisions: 1, features: ["Contact form"] },
    { name: "Business", price: 150, delivery: "5-day contract", description: "Five pages", revisions: 3, features: ["Shop setup"] },
  ]} action={pkg => <button>Book {pkg.name}</button>} />);
  expect(screen.getByText("£50")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Standard" }));
  expect(screen.getByText("£150")).toBeTruthy();
  expect(screen.getByText("5-day contract")).toBeTruthy();
  expect(screen.getByText("3 revisions included")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Book Business" })).toBeTruthy();
  expect(screen.queryByText("Contact form")).toBeNull();
});
it("previews dollar entry amounts in USD independently of the buyer currency switcher", () => {
  render(<PackageChoices priceCurrency="USD" packages={[{ name: "Basic", price: 125, delivery: "3 days", description: "One page" }]} />);
  expect(screen.getByText("$125.00")).toBeTruthy();
  expect(screen.queryByText("£125")).toBeNull();
});
