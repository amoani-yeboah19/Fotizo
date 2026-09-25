import { beforeEach, expect, it, vi } from "vitest";
import { api } from "@/api";
import { cataloguePages } from "./catalogue-page";
import { catalogService } from "./catalog.service";
vi.mock("@/api", () => ({
  api: { get: vi.fn() },
  CATALOG_USE_MOCKS: false,
  SHOP_USE_MOCKS: false,
  SELLER_CATALOG_USE_MOCKS: false,
}));
beforeEach(() => vi.clearAllMocks());
it("sends page and global filters to the API and preserves the server total", async () => {
  const response = {
    items: [],
    total: 57,
    page: 2,
    pageSize: 24,
    hasMore: false,
  };
  vi.mocked(api.get).mockResolvedValue(response);
  expect(
    await cataloguePages.list("shop", {
      page: 2,
      pageSize: 24,
      q: "boots",
      inStock: false,
      category: "shoes-bags",
      sort: "price-asc",
    }),
  ).toEqual(response);
  expect(api.get).toHaveBeenCalledExactlyOnceWith("/products", {
    channel: "shop",
    page: 2,
    pageSize: 24,
    q: "boots",
    inStock: false,
    category: "shoes-bags",
    sort: "price-asc",
  });
});
it("uses a dedicated full-channel category query and a bounded home preview", async () => {
  vi.mocked(api.get)
    .mockResolvedValueOnce([{ category: "wigs", count: 70, image: "photo" }])
    .mockResolvedValueOnce({
      items: [],
      total: 200,
      page: 0,
      pageSize: 10,
      hasMore: true,
    });
  expect(await cataloguePages.categories("shop")).toEqual([
    { category: "wigs", count: 70, image: "photo" },
  ]);
  expect(api.get).toHaveBeenNthCalledWith(1, "/products/categories", {
    channel: "shop",
  });
  expect(await catalogService.listProducts()).toEqual([]);
  expect(api.get).toHaveBeenNthCalledWith(2, "/products", {
    channel: "marketplace",
    pageSize: 10,
  });
});
it("propagates production failures instead of substituting sample inventory or counts", async () => {
  vi.mocked(api.get).mockRejectedValue(new Error("unavailable"));
  await expect(cataloguePages.list("shop")).rejects.toThrow("unavailable");
  await expect(cataloguePages.categories("shop")).rejects.toThrow(
    "unavailable",
  );
});
