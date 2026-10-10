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

it("takes 10% off only the newly restored empty departments, once", () => {
  const discounted = new Set([
    "baby",
    "beauty",
    "textiles",
    "phones",
    "sports",
    "global",
    "entertainment",
  ]);
  const originals = new Map(archived.map((p) => [p.id, p]));
  for (const p of restored) {
    const original = originals.get(p.id)!;
    expect(p.originalPrice).toBe(original.price);
    expect(p.price).toBe(
      discounted.has(p.category)
        ? Math.round((original.price * 0.9 + Number.EPSILON) * 100) / 100
        : original.price,
    );
  }
  expect(restored.filter((p) => p.price < p.originalPrice)).toHaveLength(617);
});

// The restored selection is kept as data but hidden from the shop: those
// listings are unpublished in the database and reviewed by managers there.
it("keeps the restored selection out of the shop, with its data intact", async () => {
  const catalogue = await loadSourcedCatalogue();
  const counts = Object.fromEntries(
    [
      "wigs",
      "pets",
      "jackets",
      "jewellery",
      "baby",
      "beauty",
      "textiles",
      "phones",
      "sports",
      "global",
      "entertainment",
    ].map((category) => [
      category,
      restored.filter((p) => p.category === category).length,
    ]),
  );
  expect(counts).toEqual({
    wigs: 100,
    pets: 100,
    jackets: 100,
    jewellery: 62,
    baby: 100,
    beauty: 64,
    textiles: 93,
    phones: 95,
    sports: 75,
    global: 100,
    entertainment: 90,
  });
  for (const p of archived)
    expect(catalogue.some((row) => row.id === p.id)).toBe(false);
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
    if (p.category === "jewellery")
      expect(p.title).not.toMatch(/\b(watches|watch|sunglasses)\b/i);
  }
});

it.each([
  "wigs",
  "pets",
  "jackets",
  "jewellery",
  "baby",
  "beauty",
  "textiles",
  "phones",
  "sports",
  "global",
  "entertainment",
])(
  "does not open restored %s listings in the shop",
  async (category) => {
    const product = restored.find((p) => p.category === category)!;
    expect(await shopService.getProduct(product.id)).toBeNull();
    expect(await shopService.relatedProducts(product.id)).toEqual([]);
  },
);

it("keeps other archived Alibaba product pages hidden", async () => {
  expect(
    await shopService.getProduct(
      archived.find((p) => p.category === "mens")!.id,
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
