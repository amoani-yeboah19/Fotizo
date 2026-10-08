import { expect, it } from "vitest";
import {
  discoveryPicks,
  matchesCollection,
  productCollections,
} from "./shop-discovery";
import type { ShopProduct } from "./shop-product";
const p = (
  id: string,
  title: string,
  category = "shoes-bags",
): ShopProduct => ({
  id,
  title,
  category,
  price: 10,
  originalPrice: 10,
  image: "/shoe.webp",
  images: [],
  description: "",
  rating: 0,
  sold: 0,
  freeShipping: false,
  almostGone: false,
});
it("separates women, men, children, bags, and explicitly unisex footwear", () => {
  expect(
    matchesCollection(p("1", "Women’s Mesh Running Shoes"), "women-shoes"),
  ).toBe(true);
  expect(
    matchesCollection(p("1", "Women’s Mesh Running Shoes"), "men-shoes"),
  ).toBe(false);
  expect(
    matchesCollection(p("2", "Men’s Driving Loafers"), "women-shoes"),
  ).toBe(false);
  expect(
    matchesCollection(p("3", "Women’s Shoe Storage Bag"), "women-shoes"),
  ).toBe(false);
  expect(matchesCollection(p("3", "Women’s Shoe Storage Bag"), "bags")).toBe(
    true,
  );
  expect(matchesCollection(p("4", "Girls’ Trainers"), "women-shoes")).toBe(
    false,
  );
  expect(matchesCollection(p("4", "Girls’ Trainers"), "kids-shoes")).toBe(true);
  expect(productCollections(p("5", "Unisex Trainers"))).toEqual([
    "women-shoes",
    "men-shoes",
    "all-footwear",
  ]);
  expect(matchesCollection(p("6", "Mesh Trainers"), "women-shoes")).toBe(false);
  expect(matchesCollection(p("6", "Mesh Trainers"))).toBe(true);
});
it("uses viewed interests, excludes viewed items, and keeps discovery diverse", () => {
  const products = [
    p("viewed", "Women’s Running Shoes"),
    p("woman", "Women’s Loafers"),
    p("man", "Men’s Shoes"),
    p("dress", "Women’s Dress", "womens"),
    p("oven", "Electric Oven", "appliances"),
  ];
  const history = [
    {
      id: "viewed",
      category: "shoes-bags",
      collections: ["women-shoes"],
      at: Date.now(),
    },
  ];
  const picks = discoveryPicks(products, history, 3);
  expect(picks[0].id).toBe("woman");
  expect(picks.some((p) => p.id === "viewed")).toBe(false);
  expect(new Set(picks.map((p) => p.id)).size).toBe(3);
  expect(new Set(picks.map((p) => p.category)).size).toBeGreaterThan(1);
  expect(discoveryPicks(products, [], 3)).toEqual(
    discoveryPicks(products, [], 3),
  );
  expect(discoveryPicks([], history)).toEqual([]);
});
