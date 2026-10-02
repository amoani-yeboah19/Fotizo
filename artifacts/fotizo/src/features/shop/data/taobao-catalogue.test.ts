import { expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import products from "./taobao-products.json";
import manifest from "./taobao-import-manifest.json";
import { SHOP_PRODUCTS, SHOP_CATEGORIES } from "./products";

it("accounts for all saved listings and publishes the physical products", () => {
  expect(manifest).toHaveLength(756);
  expect(products).toHaveLength(731);
  expect(manifest.filter((p) => p.kind === "consultation")).toHaveLength(3);
  expect(manifest.filter((p) => p.kind === "machining-service")).toHaveLength(3);
  for (const category of SHOP_CATEGORIES) {
    expect(SHOP_PRODUCTS.some((p) => p.category === category.id), category.id).toBe(true);
  }
  expect(manifest.filter((p) => p.kind !== "product")).toHaveLength(25);
  expect(new Set(manifest.map((p) => p.productId)).size).toBe(manifest.length);
  const publishedIds = new Set(products.map((p) => p.sourcing.productId));
  for (const source of manifest) {
    expect(publishedIds.has(source.productId)).toBe(source.kind === "product");
  }
  expect(new Set(SHOP_PRODUCTS.map((p) => p.id)).size).toBe(SHOP_PRODUCTS.length);
  for (const p of products) {
    const source = manifest.find((m) => m.productId === p.sourcing.productId)!;
    expect(source.kind).toBe("product");
    expect(p.price).toBe(Math.round(source.supplierPriceCny * 0.113 * 1.3 * 100) / 100);
    expect(p.price).toBeGreaterThan(0);
    expect(p.originalPrice).toBe(p.price);
    expect(p.sourceUrl).toBe(`https://item.taobao.com/item.htm?id=${source.productId}`);
    expect(p.title).not.toMatch(/[\u3400-\u9fff]/);
    expect("stockCount" in p).toBe(false);
    expect(existsSync(fileURLToPath(new URL(`../../../../public${p.image}`, import.meta.url)))).toBe(true);
    expect(SHOP_PRODUCTS.some((item) => item.id === p.id)).toBe(true);
  }
});
