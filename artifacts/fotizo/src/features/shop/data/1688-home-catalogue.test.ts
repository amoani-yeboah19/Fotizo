import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import rows from "./1688-home-products.json";
import pricing from "./1688-home-pricing.json";
import { loadSourcedCatalogue } from "./sourced-catalogue";
import { SHOP_CATEGORIES } from "./categories";

it("provides real local images and customer-safe English records for the new batch", () => {
  const categories = new Set(SHOP_CATEGORIES.map((c) => c.id));
  expect(rows.length).toBeGreaterThan(0);
  expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  for (const product of rows) {
    expect(categories.has(product.category)).toBe(true);
    expect(product.title).not.toMatch(/[\u3400-\u9fff]/);
    expect(product.description.length).toBeGreaterThan(30);
    expect(product.price).toBeGreaterThan(0);
    expect(product.requiresPublication).toBe(true);
    expect(JSON.stringify(product)).not.toMatch(
      /https?:|sourceUrl|stockCount|supplierPrice/,
    );
    const path = resolve("artifacts/fotizo/public", product.image.slice(1));
    expect(existsSync(path)).toBe(true);
    const bytes = readFileSync(path);
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  }
});

it("uses the captured cost with a single 30% markup and merges without duplicate identities", async () => {
  const source = JSON.parse(
    readFileSync("docs/sourcing/1688-home-2026-10-05/products.json", "utf8"),
  );
  const byId = new Map<string, { supplierPrice: string }>(
    source.map((r: { productId: string; supplierPrice: string }) => [
      `1688-${r.productId}`,
      r,
    ]),
  );
  for (const row of rows) {
    const expected =
      (Number(byId.get(row.id)!.supplierPrice) * 1.3) / pricing.cnyPerGbp;
    expect(Math.abs(row.price - expected)).toBeLessThanOrEqual(0.005001);
  }
  const catalogue = await loadSourcedCatalogue();
  expect(new Set(catalogue.map((r) => r.id)).size).toBe(catalogue.length);
  expect(
    catalogue.find((r) => r.id === "1688-973074422128")?.variants,
  ).toHaveLength(8);
  for (const row of rows)
    expect(catalogue.some((r) => r.id === row.id)).toBe(true);
});
