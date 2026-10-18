import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import rows from "./1688-textiles-accessories-products.json";
import categoryIndex from "./1688-textiles-accessories-category-index.json";
import { loadSourcedCatalogue } from "./sourced-catalogue";
import culturalOffers from "./excluded-cultural-shop-offers.json";

it("adds verified source records with local images and correctly estimated draft prices", () => {
  const root = "docs/sourcing/1688-textiles-accessories-2026-10-12/";
  const source = JSON.parse(readFileSync(`${root}products.json`, "utf8"));
  const manifest = JSON.parse(readFileSync(`${root}manifest.json`, "utf8"));
  const byId = new Map<string, { supplierPrice: string }>(
    source.map((p: { productId: string; supplierPrice: string }) => [
      `1688-${p.productId}`,
      p,
    ]),
  );
  expect(rows.length).toBeGreaterThan(29);
  expect(rows).toHaveLength(manifest.frontendAdded);
  expect(manifest.pagination.textiles.pages.length).toBeGreaterThan(1);
  expect(manifest.pagination.accessories.pages.length).toBeGreaterThan(1);
  expect(manifest.held.length).toBeGreaterThan(0);
  expect(new Set(rows.map((p) => p.id)).size).toBe(rows.length);
  expect(categoryIndex).toEqual(
    rows.map(({ id, category }) => ({ id, category })),
  );
  for (const p of rows) {
    expect(existsSync(`artifacts/fotizo/public${p.image}`)).toBe(true);
    expect(
      Math.abs(
        p.price -
          (Number(byId.get(p.id)!.supplierPrice) * 1.3) /
            manifest.pricing.cnyPerGbp,
      ),
    ).toBeLessThanOrEqual(0.005001);
    expect(p.requiresPublication).toBe(true);
    expect(p.price).toBeGreaterThan(0);
    expect(p.originalPrice).toBe(p.price);
    expect(p.rating).toBe(0);
    expect(p.sold).toBe(0);
    expect(p.title).not.toMatch(/[\u3400-\u9fff]/);
    expect(JSON.stringify(p)).not.toMatch(
      /supplierPrice|sourceUrl|CNY|stockCount/,
    );
  }
});
it("makes eligible new listings available through the sourced catalogue without duplicates", async () => {
  const all = await loadSourcedCatalogue();
  const ids = new Set(all.map((p) => p.id));
  expect(ids.size).toBe(all.length);
  const excluded = new Set(
    Object.keys(culturalOffers).map((id) => `1688-${id}`),
  );
  for (const p of rows) expect(ids.has(p.id)).toBe(!excluded.has(p.id));
});
