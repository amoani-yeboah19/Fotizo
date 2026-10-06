import { expect, it, vi } from "vitest";
import restored from "./restored-alibaba-products.json";
import archived from "./alibaba-products.json";
import { loadSourcedCatalogue } from "./sourced-catalogue";
import { shopService } from "../services/shop.service";
import { productSizeRequest } from "./product-sizes";

vi.mock("@/api", () => ({
  api: { get: vi.fn() },
  ApiError: class extends Error {},
  SHOP_USE_MOCKS: false,
}));

it("restores only the requested archive departments, with jewellery separate from other accessories", async () => {
  const catalogue = await loadSourcedCatalogue();
  const counts = Object.fromEntries(
    ["wigs", "pets", "jackets", "jewellery"].map((category) => [
      category,
      restored.filter((p) => p.category === category).length,
    ]),
  );
  expect(counts).toEqual({ wigs: 100, pets: 100, jackets: 100, jewellery: 62 });
  const ids = new Set(restored.map((p) => p.id));
  for (const p of archived)
    expect(catalogue.some((row) => row.id === p.id)).toBe(ids.has(p.id));
  expect(new Set(catalogue.map((p) => p.id)).size).toBe(catalogue.length);
  for (const p of restored) {
    expect(p.image).toBeTruthy();
    expect(p.images).toContain(p.image);
    expect(p.description).toBeTruthy();
    expect(p.requiresPublication).toBe(true);
    expect(p).not.toHaveProperty("sourceUrl");
    expect(p).not.toHaveProperty("sourcing");
    expect(p).not.toHaveProperty("stockCount");
    expect(p.title).not.toMatch(/\b(gold\s*bars?|bullion|ingots?)\b/i);
    if (p.category === "jewellery") expect(p.title).not.toMatch(/\b(watches|watch|sunglasses)\b/i);
  }
});

it.each(["wigs", "pets", "jackets", "jewellery"])(
  "opens restored %s details and related listings without a backend record",
  async (category) => {
    const product = restored.find((p) => p.category === category)!;
    expect(await shopService.getProduct(product.id)).toEqual(product);
    const related = await shopService.relatedProducts(product.id);
    expect(related.length).toBeGreaterThan(0);
    expect(
      related.every((p) => p.category === category && p.id !== product.id),
    ).toBe(true);
  },
);

it("keeps other archived Alibaba product pages hidden", async () => {
  expect(
    await shopService.getProduct(
      archived.find((p) => p.category === "phones")!.id,
    ),
  ).toBeNull();
});

it("offers clothing sizes on winter jackets without adding human sizes to pet coats", () => {
  expect(
    productSizeRequest(restored.find((p) => p.category === "jackets")!)?.sizes,
  ).toContain("XL");
  const petCoat = restored.find(
    (p) => p.category === "jackets" && /Dog Winter Coat/.test(p.title),
  )!;
  expect(productSizeRequest(petCoat)).toBeNull();
});
