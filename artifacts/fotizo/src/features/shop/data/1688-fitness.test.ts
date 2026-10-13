import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import rows from "./1688-fitness-products.json";
import index from "./1688-fitness-category-index.json";
import { categoryLabel } from "./categories";
import { loadSourcedCatalogue } from "./sourced-catalogue";
import { toShopProduct } from "../services/shop.service";
import type { Product } from "@/types";

it("retains sports links and recognises the old category label as Fitness Equipment", () => {
  expect(categoryLabel("sports")).toBe("Fitness Equipment");
  expect(
    toShopProduct({
      id: "legacy-sports",
      title: "Workout Bench",
      category: "Sports Furniture",
      specs: {},
      price: 10,
      images: [],
      description: "",
    } as Product).category,
  ).toBe("sports");
});
it("adds image-backed draft equipment with correct estimated prices and a lightweight category index", () => {
  const root = "docs/sourcing/1688-fitness-2026-10-12/";
  const source = JSON.parse(readFileSync(`${root}products.json`, "utf8"));
  const manifest = JSON.parse(readFileSync(`${root}manifest.json`, "utf8"));
  const byId = new Map<string, { supplierPrice: string }>(
    source.map((p: { productId: string; supplierPrice: string }) => [
      `1688-${p.productId}`,
      p,
    ]),
  );
  expect(rows.length).toBeGreaterThan(200);
  expect(rows).toHaveLength(manifest.frontendAdded);
  expect(manifest.pages).toHaveLength(50);
  expect(manifest.complete).toBe(true);
  expect(index).toEqual(rows.map(({ id, category }) => ({ id, category })));
  for (const p of rows) {
    expect(p.category).toBe("sports");
    expect(existsSync(`artifacts/fotizo/public${p.image}`)).toBe(true);
    expect(p.price).toBeGreaterThan(0);
    expect(
      Math.abs(
        p.price -
          (Number(byId.get(p.id)!.supplierPrice) * 1.3) /
            manifest.pricing.cnyPerGbp,
      ),
    ).toBeLessThanOrEqual(0.005001);
    expect(p.requiresPublication).toBe(true);
    expect(p.originalPrice).toBe(p.price);
    expect(p.rating).toBe(0);
    expect(p.sold).toBe(0);
    expect(JSON.stringify(p)).not.toMatch(
      /supplierPrice|sourceUrl|CNY|stockCount/,
    );
  }
});
it("includes the new equipment in the shop catalogue without duplicate identities", async () => {
  const all = await loadSourcedCatalogue();
  const ids = new Set(all.map((p) => p.id));
  expect(ids.size).toBe(all.length);
  for (const p of rows) expect(ids.has(p.id)).toBe(true);
});
