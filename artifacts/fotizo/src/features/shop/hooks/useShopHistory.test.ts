// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import {
  recordShopView,
  readShopHistory,
  clearShopHistory,
} from "./useShopHistory";
import type { ShopProduct } from "../data/shop-product";
const product: ShopProduct = {
  id: "1688-123",
  category: "shoes-bags",
  title: "Women’s Trainers",
  price: 10,
  originalPrice: 10,
  image: "/shoe.webp",
  images: [],
  description: "",
  rating: 0,
  sold: 0,
  freeShipping: false,
  almostGone: false,
};
beforeEach(() => localStorage.clear());
it("records only limited product interests, deduplicates views and clears them", () => {
  for (let i = 0; i < 40; i++) recordShopView({ ...product, id: String(i) });
  recordShopView({ ...product, id: "39" });
  expect(readShopHistory()).toHaveLength(30);
  expect(readShopHistory()[0].id).toBe("39");
  expect(Object.keys(readShopHistory()[0]).sort()).toEqual([
    "at",
    "category",
    "collections",
    "id",
  ]);
  clearShopHistory();
  expect(readShopHistory()).toEqual([]);
});
it("respects pause and rejects corrupt or expired stored data", () => {
  localStorage.setItem("fotizo.shop.views.enabled", "false");
  recordShopView(product);
  expect(readShopHistory()).toEqual([]);
  localStorage.removeItem("fotizo.shop.views.enabled");
  localStorage.setItem("fotizo.shop.views.v1", "broken");
  expect(readShopHistory()).toEqual([]);
  localStorage.setItem(
    "fotizo.shop.views.v1",
    JSON.stringify([
      {
        id: "old",
        category: "shoes-bags",
        collections: [],
        at: Date.now() - 31 * 86400000,
      },
      null,
      { id: "invalid", category: "unknown", collections: [], at: Date.now() },
    ]),
  );
  expect(readShopHistory()).toEqual([]);
});
