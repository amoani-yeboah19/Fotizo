// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import ShopProductPage from "./ShopProductPage";
import detailed from "../data/1688-detail-products.json";

const mocks = vi.hoisted(() => ({ addItem: vi.fn() }));
vi.mock("wouter", () => ({
  useRoute: () => [true, { id: "1688-973074422128" }],
  useLocation: () => ["", vi.fn()],
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/features/shop/hooks", () => ({
  useShopProduct: () => ({ data: detailed[0], isLoading: false }),
  useShopRelatedProducts: () => ({ data: [] }),
}));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addItem: mocks.addItem }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/common/Price", () => ({
  Price: ({ amount }: { amount: number }) => <span>£{amount.toFixed(2)}</span>,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("switches to the selected colour photo and selects only a real size combination", () => {
  render(<ShopProductPage />);
  fireEvent.click(screen.getByRole("button", { name: "Oatmeal" }));
  fireEvent.click(screen.getByRole("button", { name: "XL" }));
  expect(screen.getByRole("status").textContent).toContain("Oatmeal / XL");
  const variant = detailed[0].variants.find(
    (v) => v.colour === "Oatmeal" && v.size === "XL",
  )!;
  expect(screen.getByAltText(detailed[0].title).getAttribute("src")).toBe(
    variant.image,
  );
  expect(screen.queryByRole("button", { name: "Black" })).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "Available soon",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(mocks.addItem).not.toHaveBeenCalled();
  expect(
    [...document.querySelectorAll("a")].some((a) =>
      /1688.com|alibaba.com/.test(a.href),
    ),
  ).toBe(false);
});

it("labels body-weight guidance without inventing garment measurements", () => {
  render(<ShopProductPage />);
  fireEvent.click(screen.getByText("Size guidance"));
  expect(screen.getByText("40–47.5 kg")).toBeTruthy();
  expect(screen.getByText("62.5–75 kg")).toBeTruthy();
  expect(screen.getByText(/These are not garment measurements/)).toBeTruthy();
  expect(detailed[0].variants).toHaveLength(8);
  expect(new Set(detailed[0].variants.map((v) => v.id)).size).toBe(8);
});
