// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersonalizedHome } from "./PersonalizedHome";
import { recordShopView } from "@/features/shop/hooks/useShopHistory";
import type { ShopProduct } from "@/features/shop/data/shop-product";

const fixtures = vi.hoisted(() => ({ rows: [] as ShopProduct[] }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/features/marketplace/hooks", () => ({
  useProducts: () => ({ data: [] }),
}));
vi.mock("@/features/artisans/hooks", () => ({
  useServices: () => ({ data: [] }),
}));
vi.mock("./Categories", () => ({ Categories: () => null }));
vi.mock("@/features/shop/data/sourced-catalogue", () => ({
  loadSourcedCatalogue: async () => fixtures.rows,
}));
vi.mock("@/features/shop/components/ShopProductCard", () => ({
  ShopProductCard: ({ product }: { product: ShopProduct }) => (
    <p data-testid="recommended" data-category={product.category}>
      {product.title}
    </p>
  ),
}));
vi.mock("@/features/marketplace/components/ProductCard", () => ({
  ProductCard: () => null,
}));
vi.mock("@/features/artisans/components/ServiceCard", () => ({
  ServiceCard: () => null,
}));

beforeEach(() => {
  localStorage.clear();
  fixtures.rows = ["womens", "mens", "appliances", "phones"].flatMap(
    (category) =>
      [1, 2, 3].map(
        (n): ShopProduct => ({
          id: `${category}-${n}`,
          category,
          title: `${category} find ${n}`,
          description: "",
          price: 5,
          originalPrice: 5,
          image: "/test.webp",
          images: [],
          sold: 0,
          rating: 0,
          almostGone: false,
          freeShipping: false,
        }),
      ),
  );
});
afterEach(cleanup);
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        })
      }
    >
      <PersonalizedHome />
    </QueryClientProvider>,
  );
}
it("shows a varied discovery mix rather than claiming personalisation without history", async () => {
  mount();
  await waitFor(() =>
    expect(screen.getAllByTestId("recommended")).toHaveLength(10),
  );
  expect(
    screen.getByRole("heading", { name: "Discover something you’ll love" }),
  ).toBeTruthy();
  expect(
    new Set(screen.getAllByTestId("recommended").map((p) => p.dataset.category))
      .size,
  ).toBe(4);
});
it("updates suggestions when browsing changes and excludes already viewed items", async () => {
  mount();
  await screen.findAllByTestId("recommended");
  recordShopView(fixtures.rows.find((p) => p.id === "appliances-1")!);
  await screen.findByRole("heading", { name: "Based on your recent browsing" });
  await waitFor(() =>
    expect(screen.getAllByTestId("recommended")[0].dataset.category).toBe(
      "appliances",
    ),
  );
  expect(screen.queryByText("appliances find 1")).toBeNull();
  recordShopView(fixtures.rows.find((p) => p.id === "womens-1")!);
  await waitFor(() =>
    expect(screen.getAllByTestId("recommended")[0].dataset.category).toBe(
      "womens",
    ),
  );
  expect(screen.queryByText("womens find 1")).toBeNull();
});
