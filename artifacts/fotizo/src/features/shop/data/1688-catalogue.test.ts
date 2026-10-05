import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import products from "./1688-products.json";
import pricing from "./1688-pricing.json";

it("ships a real local photo and English copy for every sourced product", () => {
  expect(products).toHaveLength(3239);
  expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
  for (const product of products) {
    const image = readFileSync(
      resolve("artifacts/fotizo/public", product.image.slice(1)),
    );
    expect(image.subarray(0, 4).toString()).toBe("RIFF");
    expect(image.subarray(8, 12).toString()).toBe("WEBP");
    expect(product.title).not.toMatch(/[\u3400-\u9fff]|\d{10,}/);
    expect(product.description.length).toBeGreaterThan(40);
    expect(product).not.toHaveProperty("sourceUrl");
    expect(product).not.toHaveProperty("stockCount");
    expect(product.requiresPublication).toBe(true);
  }
});

it("uses the verified CNY rate and applies the 30% markup exactly once", () => {
  const source = JSON.parse(
    readFileSync(
      "docs/sourcing/1688-clothing-2026-10-04/products.json",
      "utf8",
    ),
  ) as { productId: string; supplierPrice: string }[];
  const costs = new Map(
    source.map((p) => [`1688-${p.productId}`, Number(p.supplierPrice)]),
  );
  for (const product of products) {
    expect(product.price).toBeGreaterThan(0);
    expect(
      Math.abs(
        product.price - (costs.get(product.id)! * 1.3) / pricing.cnyPerGbp,
      ),
    ).toBeLessThanOrEqual(0.005001);
  }
  expect(products.some((p) => p.id === "1688-1061382831632")).toBe(false);
});
