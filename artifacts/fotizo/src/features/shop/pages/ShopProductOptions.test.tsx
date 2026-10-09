// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import ShopProductPage from "./ShopProductPage";
import catalogue from "../data/1688-products.json";
import detailed from "../data/1688-detail-products.json";
import { ShopProductCard } from "../components/ShopProductCard";

const mocks = vi.hoisted(() => ({ addItem: vi.fn(), basic: false, published: false }));
vi.mock("wouter", () => ({
  useRoute: () => [true, { id: "1688-973074422128" }],
  useLocation: () => ["", vi.fn()],
  Link: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/features/shop/hooks", () => ({
  useShopProduct: () => ({
    data: mocks.basic
      ? catalogue[0]
      : mocks.published
        ? { ...detailed[0], requiresPublication: false }
        : detailed[0],
    isLoading: false,
  }),
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
vi.mock("@/features/wishlist/components/WishlistButton", () => ({ WishlistButton: () => null }));
vi.mock("@/components/common/Price", () => ({
  Price: ({ amount }: { amount: number }) => <span>£{amount.toFixed(2)}</span>,
}));
afterEach(() => {
  mocks.basic = false;
  mocks.published = false;
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

it("lets shoppers request a standard clothing size without claiming a supplier variant", () => {
  mocks.basic = true;
  render(<ShopProductPage />);
  expect(
    screen.getByRole("region", { name: "Product information" }),
  ).toBeTruthy();
  expect(screen.getByText(catalogue[0].description)).toBeTruthy();
  expect(screen.getByAltText(catalogue[0].title).getAttribute("src")).toBe(
    catalogue[0].image,
  );
  fireEvent.click(screen.getByRole("button", { name: "XL" }));
  expect(
    screen.getByRole("button", { name: "XL" }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(screen.getByRole("status").textContent).toBe("Requested size: XL");
  expect(screen.getByText(/Standard size requests/)).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: /Add to cart/i }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(mocks.addItem).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: "Increase quantity" }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Enlarge product photo" }),
  );
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.getByAltText("Enlarged product view").getAttribute("src")).toBe(
    catalogue[0].image,
  );
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("takes clothing shoppers from the card to size selection", () => {
  render(<ShopProductCard product={catalogue[0]} />);
  const link = screen.getByRole("link", {
    name: `Choose size for ${catalogue[0].title}`,
  });
  expect(link.getAttribute("href")).toBe(`/shop/${catalogue[0].id}`);
  expect(screen.queryByRole("button", { name: /Add .* to cart/ })).toBeNull();
});

it("adds a published product with the chosen colour and size, and asks for them first", () => {
  mocks.published = true;
  render(<ShopProductPage />);
  fireEvent.click(screen.getByRole("button", { name: /Add to cart/ }));
  expect(mocks.addItem).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Oatmeal" }));
  fireEvent.click(screen.getByRole("button", { name: "XL" }));
  fireEvent.click(screen.getByRole("button", { name: /Add to cart/ }));
  expect(mocks.addItem).toHaveBeenCalledWith(
    expect.objectContaining({ productId: "1688-973074422128", options: "Colour: Oatmeal · Size: XL" }),
  );
});
