import { beforeEach, expect, it, vi } from "vitest";
import { shopService } from "./shop.service";
import { api } from "@/api";
import { loadSourcedCatalogue } from "../data/sourced-catalogue";
import type { Product } from "@/types";

vi.mock("@/api", async (original) => ({
  ...(await original<typeof import("@/api")>()),
  SHOP_USE_MOCKS: false,
  api: { get: vi.fn() },
}));
vi.mock("../data/sourced-catalogue", () => ({ loadSourcedCatalogue: vi.fn() }));

const liveProduct = (offer: string): Product =>
  ({
    id: "published-uuid",
    title: "Car Interior Ornament",
    channel: "shop",
    description: "Car accessory",
    images: ["https://supplier.example/photo.webp"],
    specs: {},
    sourcing: { platform: "1688", productId: offer, priceStatus: "estimated" },
  }) as Product;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loadSourcedCatalogue).mockResolvedValue([]);
});

it("blocks direct imported and preview links for excluded ornaments", async () => {
  expect(await shopService.getProduct("1688-831675574981")).toBeNull();
  expect(await shopService.getProduct("preview-1688-831675574981")).toBeNull();
  expect(api.get).not.toHaveBeenCalled();
});

it("blocks published direct links even when supplier pricing is absent", async () => {
  vi.mocked(api.get).mockResolvedValue(liveProduct("839250115998"));
  expect(await shopService.getProduct("published-uuid")).toBeNull();
});

it("filters symbolic ornaments from published related products", async () => {
  const clean = { ...liveProduct("836022061554"), id: "clean-uuid" };
  vi.mocked(api.get).mockResolvedValue([liveProduct("843019158760"), clean]);
  expect(
    (await shopService.relatedProducts("other-uuid")).map((p) => p.id),
  ).toEqual(["clean-uuid"]);
});
