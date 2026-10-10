import { beforeEach, expect, it, vi } from "vitest";
import { shopCataloguePage, clearShopCatalogueCache } from "./shop-catalogue";
import { cataloguePages } from "@/features/marketplace/services/catalogue-page";
import { loadSourcedCatalogue } from "../data/sourced-catalogue";
import type { ShopProduct } from "../data/shop-product";

vi.mock("@/features/marketplace/services/catalogue-page", () => ({
  cataloguePages: { list: vi.fn() },
}));
vi.mock("../data/sourced-catalogue", () => ({ loadSourcedCatalogue: vi.fn() }));
const publishedOffers = vi.hoisted(() => vi.fn());
vi.mock("./shop.service", async (original) => {
  const actual = await original<typeof import("./shop.service")>();
  return {
    toShopProduct: (p: unknown) => p,
    offerOf: actual.offerOf,
    withLocalDetails: actual.withLocalDetails,
    publishedOffers,
  };
});
const item = (id: string, price: number): ShopProduct => ({
  id,
  price,
  originalPrice: price,
  title: "Striped T-Shirt",
  description: "Cotton long sleeve top",
  category: "mens",
  image: "/images/test.webp",
  images: [],
  rating: 0,
  sold: 0,
  freeShipping: false,
  almostGone: false,
});
beforeEach(() => {
  vi.resetAllMocks();
  clearShopCatalogueCache();
  publishedOffers.mockResolvedValue(new Set());
  vi.mocked(loadSourcedCatalogue).mockResolvedValue([
    item("1688-1", 2),
    item("1688-2", 6),
    item("1688-3", 10),
  ]);
  vi.mocked(cataloguePages.list).mockImplementation(
    async (_channel, filters = {}) => {
      const page = filters.page ?? 0,
        size = filters.pageSize ?? 48;
      const products = [
        item("live-1", 1),
        item("live-2", 5),
        item("live-3", 9),
      ];
      return {
        items: products.slice(page * size, (page + 1) * size) as never[],
        total: 3,
        page,
        pageSize: size,
        hasMore: (page + 1) * size < 3,
      };
    },
  );
});
it("merges sorted server and sourced pages without skipping or repeating products", async () => {
  const pages = await Promise.all(
    [0, 1, 2].map((page) =>
      shopCataloguePage({ page, pageSize: 2, sort: "price-asc" }),
    ),
  );
  expect(pages.flatMap((p) => p.items.map((i) => i.id))).toEqual([
    "live-1",
    "1688-1",
    "live-2",
    "1688-2",
    "live-3",
    "1688-3",
  ]);
  expect(pages.map((p) => p.total)).toEqual([6, 6, 6]);
  expect(pages[2].hasMore).toBe(false);
});

it("includes restored discounts in the discounted filter", async () => {
  vi.mocked(loadSourcedCatalogue).mockResolvedValue([
    { ...item("alibaba-sale", 9), originalPrice: 10 },
    item("alibaba-full-price", 10),
  ]);
  vi.mocked(cataloguePages.list).mockResolvedValue({
    items: [],
    total: 0,
    page: 0,
    pageSize: 48,
    hasMore: false,
  });
  const result = await shopCataloguePage({ discounted: true });
  expect(result.items.map((p) => p.id)).toEqual(["alibaba-sale"]);
});
it("keeps sourced products available when the backend fails and reports the failure", async () => {
  vi.mocked(cataloguePages.list).mockRejectedValue(new Error("offline"));
  const result = await shopCataloguePage({
    q: "cotton",
    category: "mens",
    minPrice: 5,
    sort: "price-desc",
  });
  expect(result.items.map((p) => p.id)).toEqual(["1688-3", "1688-2"]);
  expect(result.liveError).toBe(true);
  expect((await shopCataloguePage({ category: "womens" })).items).toEqual([]);
});

it("filters complete departments before paging a women’s shoe collection", async () => {
  vi.mocked(loadSourcedCatalogue).mockResolvedValue([
    {
      ...item("woman-local", 3),
      category: "shoes-bags",
      title: "Women’s Running Shoes",
    },
    {
      ...item("bag", 2),
      category: "shoes-bags",
      title: "Women’s Shoulder Bag",
    },
  ]);
  const live = [
    { ...item("male", 1), category: "shoes-bags", title: "Men’s Shoes" },
    { ...item("child", 2), category: "shoes-bags", title: "Girls’ Shoes" },
    {
      ...item("woman-live", 4),
      category: "shoes-bags",
      title: "Women’s Loafers",
    },
  ];
  vi.mocked(cataloguePages.list).mockImplementation(
    async (_channel, f = {}) => ({
      items: live.slice(
        (f.page ?? 0) * (f.pageSize ?? 1),
        ((f.page ?? 0) + 1) * (f.pageSize ?? 1),
      ) as never[],
      total: 3,
      page: f.page ?? 0,
      pageSize: f.pageSize ?? 1,
      hasMore: (f.page ?? 0) < 2,
    }),
  );
  const first = await shopCataloguePage({
    category: "shoes-bags",
    collection: "women-shoes",
    sort: "price-asc",
    pageSize: 1,
  });
  const second = await shopCataloguePage({
    category: "shoes-bags",
    collection: "women-shoes",
    sort: "price-asc",
    pageSize: 1,
    page: 1,
  });
  expect(first.items.map((p) => p.id)).toEqual(["woman-local"]);
  expect(second.items.map((p) => p.id)).toEqual(["woman-live"]);
  expect(first.total).toBe(2);
  expect(second.hasMore).toBe(false);
  expect(
    vi
      .mocked(cataloguePages.list)
      .mock.calls.every(([, f]) => !("collection" in (f ?? {}))),
  ).toBe(true);
});

it("shows a published 1688 offer once, from the server, with its local details and link", async () => {
  // Offer 2 is published: the server lists it (its own id and price); the
  // local preview supplies variants and the familiar 1688-2 link.
  publishedOffers.mockResolvedValue(new Set(["2"]));
  vi.mocked(loadSourcedCatalogue).mockResolvedValue([
    item("1688-1", 2),
    {
      ...item("1688-2", 6),
      requiresPublication: true,
      specifications: [{ label: "Material", value: "Cotton" }],
      variants: [{ id: "v1", colour: "Black", size: "M", image: "", price: 6 }],
    },
  ]);
  vi.mocked(cataloguePages.list).mockResolvedValue({
    items: [{ ...item("uuid-2", 6.6), sourcing: { platform: "1688", productId: "2" } }] as never[],
    total: 1,
    page: 0,
    pageSize: 48,
    hasMore: false,
  });
  const page = await shopCataloguePage({ page: 0, pageSize: 48 });
  expect(page.total).toBe(2);
  expect(page.items.map((i) => i.id).sort()).toEqual(["1688-1", "1688-2"]);
  const published = page.items.find((i) => i.id === "1688-2")!;
  expect(published).toMatchObject({
    price: 6.6,
    requiresPublication: false,
    specifications: [{ label: "Material", value: "Cotton" }],
    variants: [{ id: "v1", price: 6.6 }],
  });
});
