// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SourcedListings, filterListings } from "./SourcedListings";
import type { SellerProduct } from "@/types";
const state = vi.hoisted(() => ({ items: [] as SellerProduct[] }));
vi.mock("../../hooks", () => ({
  useSellerProducts: () => ({
    data: state.items,
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@/features/marketplace/hooks", () => ({
  useOwnedProduct: () => ({
    data: {
      title: "Desk lamp",
      description: "Adjustable lamp",
      price: 20,
      stockCount: 2,
      category: "lighting",
      images: [],
      image: "/lamp.jpg",
      specs: { Colour: "White" },
      status: "unpublished",
    },
  }),
}));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ format: (n: number) => `£${n}` }),
}));
afterEach(cleanup);
const lamp: SellerProduct = {
  id: "lamp",
  title: "Desk lamp",
  price: 20,
  stock: 2,
  sales: 3,
  rating: 0,
  reviewCount: 0,
  status: "active",
  image: "/lamp.jpg",
  category: "lighting",
};
it("combines product search, department and stock filters", () => {
  const unpublished = { ...lamp, id: "draft", status: "unpublished" };
  expect(
    filterListings([lamp, unpublished], " desk ", "lighting", "low"),
  ).toEqual([lamp]);
  expect(
    filterListings([lamp, unpublished], "draft", "all", "Unpublished"),
  ).toEqual([unpublished]);
});
it("opens private product details and links to the China desk edit route", async () => {
  state.items = [lamp];
  render(<SourcedListings />);
  expect(
    screen.getByRole("img", { name: "Desk lamp" }).getAttribute("src"),
  ).toBe("/lamp.jpg");
  expect(
    screen.getByRole("link", { name: "Edit Desk lamp" }).getAttribute("href"),
  ).toBe("/dashboard/china_representative/products/lamp/edit");
  fireEvent.click(screen.getByRole("button", { name: "View Desk lamp" }));
  expect(await screen.findByText("Adjustable lamp")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Edit product" })).toBeTruthy();
});
it("resets pagination when a search narrows the results", () => {
  state.items = Array.from({ length: 22 }, (_, i) => ({
    ...lamp,
    id: `p${i}`,
    title: `Lamp ${i}`,
  }));
  render(<SourcedListings />);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("21–22 of 22 products")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Search products"), {
    target: { value: "Lamp 0" },
  });
  expect(screen.getByText("1–1 of 1 products")).toBeTruthy();
});
