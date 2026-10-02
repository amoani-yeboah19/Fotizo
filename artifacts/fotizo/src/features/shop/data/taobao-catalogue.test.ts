import { expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import products from "./taobao-products.json";
import manifest from "./taobao-import-manifest.json";
import { SHOP_PRODUCTS } from "./products";

it("accounts for all saved listings and publishes the physical products", () => {
  expect(manifest).toHaveLength(47);
  expect(products).toHaveLength(44);
  expect(manifest.filter((p) => p.kind === "consultation")).toHaveLength(3);
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
