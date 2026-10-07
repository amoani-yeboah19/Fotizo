import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import products from "./1688-shoes-products.json";
import pricing from "./1688-shoes-pricing.json";
import { loadSourcedCatalogue } from "./sourced-catalogue";
import { productSizeRequest } from "./product-sizes";

const root = "docs/sourcing/1688-shoes-2026-10-07";

it("has a local decoded-photo export, English listing and size selection for every added shoe", () => {
  expect(products.length).toBeGreaterThan(0);
  for (const p of products) {
    expect(p.category).toBe("shoes-bags");
    expect(p.title).not.toMatch(/[\u3400-\u9fff]/);
    expect(p.description.length).toBeGreaterThan(40);
    expect(p.price).toBeGreaterThan(0);
    expect(p.requiresPublication).toBe(true);
    expect(productSizeRequest(p)?.sizes.length).toBeGreaterThan(0);
    expect(JSON.stringify(p)).not.toMatch(
      /https?:|sourceUrl|stockCount|supplierPrice/,
    );
    const bytes = readFileSync(
      resolve("artifacts/fotizo/public", p.image.slice(1)),
    );
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  }
});

it("prices from supplier cost with one 30% markup and preserves source coverage", async () => {
  const source = JSON.parse(readFileSync(`${root}/products.json`, "utf8")) as {
    productId: string;
    supplierPrice: string;
  }[];
  const byId = new Map(source.map((r) => [`1688-${r.productId}`, r]));
  for (const p of products) {
    const price =
      (Number(byId.get(p.id)!.supplierPrice) * 1.3) / pricing.cnyPerGbp;
    expect(Math.abs(p.price - price)).toBeLessThanOrEqual(0.005001);
    expect(p.originalPrice).toBe(p.price);
  }
  const coverage = JSON.parse(readFileSync(`${root}/coverage.json`, "utf8"));
  expect(coverage).toHaveLength(3);
  for (const category of coverage) {
    expect(category.pages.map((p: { page: number }) => p.page)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
    expect(
      category.pages.every((p: { error: string | null }) => !p.error),
    ).toBe(true);
  }
  const all = await loadSourcedCatalogue();
  expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
  const ids = new Set(all.map((p) => p.id));
  for (const p of products) expect(ids.has(p.id)).toBe(true);
});

it("matches the export manifest and records held offers separately", () => {
  const manifest = JSON.parse(readFileSync(`${root}/manifest.json`, "utf8"));
  expect(manifest.frontendAdded).toBe(products.length);
  expect(manifest.frontendAdded + manifest.held).toBe(manifest.capturedUnique);
  const bytes = readFileSync(
    "artifacts/fotizo/src/features/shop/data/1688-shoes-products.json",
  );
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    manifest.files["1688-shoes-products.json"],
  );
});
