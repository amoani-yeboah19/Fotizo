import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import products from "./1688-departments-products.json";
import pricing from "./1688-departments-pricing.json";
import { loadSourcedCatalogue } from "./sourced-catalogue";

const root = "docs/sourcing/1688-departments-2026-10-07";

it("fills the small departments with photographed English products, without exposing supplier links", async () => {
  const counts = new Map<string, number>();
  for (const p of products) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    expect(p.title).not.toMatch(/[\u3400-\u9fff]/);
    expect(p.description.length).toBeGreaterThan(40);
    expect(p.price).toBeGreaterThan(0);
    expect(p.requiresPublication).toBe(true);
    expect(JSON.stringify(p)).not.toMatch(
      /https?:|sourceUrl|stockCount|supplierPrice/,
    );
    const bytes = readFileSync(
      resolve("artifacts/fotizo/public", p.image.slice(1)),
    );
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  }
  for (const category of [
    "furniture",
    "clocks",
    "industrial",
    "smart-devices",
  ]) {
    expect(counts.get(category)).toBeGreaterThan(0);
  }
  const all = await loadSourcedCatalogue();
  expect(all.length).toBeGreaterThanOrEqual(15000);
  expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
  const ids = new Set(all.map((p) => p.id));
  for (const p of products) expect(ids.has(p.id)).toBe(true);
});

it("applies the agreed markup once and reconciles capture, holds and exported products", () => {
  const source = JSON.parse(readFileSync(`${root}/products.json`, "utf8")) as {
    productId: string;
    supplierPrice: string;
    proposedCategory: string;
  }[];
  const byId = new Map(source.map((r) => [`1688-${r.productId}`, r]));
  for (const p of products) {
    const row = byId.get(p.id)!;
    expect(p.category).toBe(row.proposedCategory);
    const rawPrice = (Number(row.supplierPrice) * 1.3) / pricing.cnyPerGbp;
    expect(Math.abs(p.price - rawPrice)).toBeLessThanOrEqual(0.005001);
    expect(p.originalPrice).toBe(p.price);
  }
  const coverage = JSON.parse(readFileSync(`${root}/coverage.json`, "utf8"));
  expect(coverage).toHaveLength(4);
  for (const category of coverage) {
    expect(category.pages.map((p: { page: number }) => p.page)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
    expect(
      category.pages.every((p: { error: string | null }) => !p.error),
    ).toBe(true);
  }
  const manifest = JSON.parse(readFileSync(`${root}/manifest.json`, "utf8"));
  expect(manifest.frontendAdded).toBe(products.length);
  expect(manifest.frontendAdded + manifest.held).toBe(manifest.capturedUnique);
  const bytes = readFileSync(
    "artifacts/fotizo/src/features/shop/data/1688-departments-products.json",
  );
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    manifest.files["1688-departments-products.json"],
  );
});
