// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProductOptions } from "./ProductOptions";
import { clothingSizeRequest } from "../data/clothing-sizes";
import { productSizeRequest } from "../data/product-sizes";
import type { ShopProduct } from "../data/shop-product";
import catalogue from "../data/1688-products.json";

afterEach(cleanup);

it("offers shoe sizes for lace-up shoes without treating them as spare laces", () => {
  render(<Sizes category="shoes-bags" title="Women’s Lace-Up Running Shoes" />);
  expect(screen.getByRole("button", { name: "EU 38" })).toBeTruthy();
  expect(
    productSizeRequest({
      ...catalogue[0],
      category: "shoes-bags",
      title: "Replacement Shoe Laces",
    }),
  ).toBeNull();
});

it("offers EU shoe-size requests and updates the selected size", () => {
  render(<Sizes category="shoes-bags" title="Men’s Running Sneakers" />);
  expect(screen.getByRole("group", { name: /Shoe size \(EU\)/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "EU 42" }));
  expect(screen.getByRole("status").textContent).toBe("Requested size: EU 42");
  fireEvent.click(screen.getByRole("button", { name: "EU 43" }));
  expect(
    screen.getByRole("button", { name: "EU 42" }).getAttribute("aria-pressed"),
  ).toBe("false");
  expect(screen.getByRole("status").textContent).toBe("Requested size: EU 43");
  expect(screen.queryByRole("button", { name: "XL" })).toBeNull();
});

it("uses children's sizes for children's shoes", () => {
  render(<Sizes category="baby" title="Children’s Sandals" />);
  fireEvent.click(screen.getByRole("button", { name: "EU 24" }));
  expect(screen.getByRole("status").textContent).toBe("Requested size: EU 24");
  expect(screen.queryByRole("button", { name: "EU 42" })).toBeNull();
});

it.each([
  "Travel Shoe Storage Bag",
  "Leather Shoulder Bag",
  "Shoe Cleaning Brush",
  "Boot Rack",
  "Shoe Insoles",
])("does not add shoe sizes to %s", (title) => {
  render(<Sizes category="shoes-bags" title={title} />);
  expect(screen.queryByRole("group")).toBeNull();
});

it("preserves verified shoe variants", () => {
  expect(
    productSizeRequest({
      ...catalogue[0],
      category: "shoes-bags",
      title: "Sneakers",
      variants: [
        {
          id: "shoe-sku",
          colour: "Black",
          size: "EU 42",
          price: 20,
          image: "/shoe.webp",
        },
      ],
    }),
  ).toBeNull();
});

function Sizes({ category, title }: { category: string; title: string }) {
  const [size, setSize] = useState("");
  return (
    <ProductOptions
      product={{ ...catalogue[0], category, title }}
      colour=""
      size={size}
      onSize={setSize}
      onColour={() => {}}
    />
  );
}

it.each(["mens", "womens"])(
  "offers selectable inch waist sizes for %s jeans",
  (category) => {
    render(<Sizes category={category} title="Relaxed-Fit Jeans" />);
    expect(
      screen.getByRole("group", { name: /Waist size \(inches\)/ }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "W32" }));
    expect(screen.getByRole("status").textContent).toBe("Requested size: W32");
    fireEvent.click(screen.getByRole("button", { name: "W34" }));
    expect(
      screen.getByRole("button", { name: "W32" }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(screen.getByRole("status").textContent).toBe("Requested size: W34");
    expect(screen.queryByRole("button", { name: "XL" })).toBeNull();
    expect(
      screen.getByText(
        /Leg length and garment fit must be confirmed separately/,
      ),
    ).toBeTruthy();
  },
);

it.each(["Long-Sleeve Dress", "Denim Jacket", "Sweatpants"])(
  "offers letter sizes for %s",
  (title) => {
    render(<Sizes category="womens" title={title} />);
    fireEvent.click(screen.getByRole("button", { name: "M" }));
    expect(screen.getByRole("status").textContent).toBe("Requested size: M");
    expect(screen.queryByRole("button", { name: "W32" })).toBeNull();
  },
);

it("never replaces real supplier combinations or adds clothing sizes to accessories", () => {
  const base: ShopProduct = {
    ...catalogue[0],
    category: "mens",
    title: "T-Shirt",
  };
  expect(
    clothingSizeRequest({
      ...base,
      variants: [
        {
          id: "sku",
          colour: "Black",
          size: "M",
          price: 10,
          image: "/image.webp",
        },
      ],
    }),
  ).toBeNull();
  expect(clothingSizeRequest({ ...base, title: "Leather Belt" })).toBeNull();
  expect(clothingSizeRequest({ ...base, category: "electronics" })).toBeNull();
});
