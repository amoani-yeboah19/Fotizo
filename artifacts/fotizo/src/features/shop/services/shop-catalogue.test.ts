import { beforeEach, expect, it, vi } from "vitest";
import { shopCataloguePage, clearShopCatalogueCache } from "./shop-catalogue";
import { cataloguePages } from "@/features/marketplace/services/catalogue-page";
import { loadSourcedCatalogue } from "../data/sourced-catalogue";
import type { ShopProduct } from "../data/shop-product";

vi.mock("@/features/marketplace/services/catalogue-page", () => ({
  cataloguePages: { list: vi.fn() },
}));
vi.mock("../data/sourced-catalogue", () => ({ loadSourcedCatalogue: vi.fn() }));
vi.mock("./shop.service", () => ({ toShopProduct: (p: unknown) => p }));
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
