import { describe, expect, it } from "vitest";
import alibabaProducts from "./alibaba-products.json";
import { SHOP_CATEGORIES, SHOP_PRODUCTS } from "./products";
import { parseProducts } from "../../../../tools/parse-alibaba-page.mjs";

describe("Alibaba frontend catalogue", () => {
  it("covers every active department with traceable listings", () => {
    for (const category of SHOP_CATEGORIES) {
      expect(alibabaProducts.some((p) => p.category === category.id), category.id).toBe(true);
    }
    const categories = new Set(SHOP_CATEGORIES.map((c) => c.id));
    for (const p of alibabaProducts) {
      expect(categories.has(p.category)).toBe(true);
      expect(p.sourceUrl).toContain(`_${p.sourcing.productId}.html`);
      expect(new URL(p.sourceUrl).hostname).toBe("www.alibaba.com");
      expect(p.images).toContain(p.image);
      expect(p.images.every((url) => new URL(url).hostname.endsWith(".alicdn.com"))).toBe(true);
      expect(Number.isFinite(p.price) && p.price > 0).toBe(true);
      expect(p.originalPrice).toBe(p.price);
      expect(p.sourcing.priceStatus).toBe("estimate");
      expect(p.sourcing.currency).toBe("USD");
      expect(p.sourcing.priceRange).toMatch(/^US \$/);
    }
  });

  it("merges refreshed listings without duplicate public or supplier IDs", () => {
    expect(new Set(SHOP_PRODUCTS.map((p) => p.id)).size).toBe(SHOP_PRODUCTS.length);
    expect(new Set(alibabaProducts.map((p) => p.sourcing.productId)).size).toBe(alibabaProducts.length);
    for (const p of alibabaProducts) {
      expect(SHOP_PRODUCTS.filter((candidate) => candidate.sourceUrl?.includes(`_${p.sourcing.productId}.html`))).toHaveLength(1);
    }
  });

  it("preserves escaped screen measurements when parsing supplier titles", () => {
    const html = JSON.stringify({ image: { multiImage: ["https://s.alicdn.com/phone.jpg"] }, puretitle: 'Android 6.5" Smartphone', price: "US $50-$70", priceMini: "US $50", productUrl: "https://www.alibaba.com/product-detail/Phone_123456.html" });
    expect(parseProducts(html)[0].title).toBe('Android 6.5" Smartphone');
  });
});
