// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogueBrowser } from "./CatalogueBrowser";
import { cataloguePages, type CataloguePage } from "../services/catalogue-page";
import type { CatalogueProduct } from "@workspace/api-client-react";
vi.mock("../services/catalogue-page", () => ({
  cataloguePages: { list: vi.fn(), categories: vi.fn() },
}));
const product = (i: number): CatalogueProduct => ({
  id: `product-${i}`,
  title: `Product ${i}`,
  description: "A product",
  price: 10,
  originalPrice: null,
  rating: 4,
  reviewCount: 0,
  seller: "Seller",
  sellerId: "seller",
  category: "Electronics",
  channel: "marketplace",
  status: "active",
  image: "",
  images: [],
  inStock: true,
  stockCount: 1,
  tags: [],
  specs: {},
});
const result = (page = 0): CataloguePage => ({
  items: Array.from({ length: page === 0 ? 24 : 2 }, (_, i) =>
    product(page * 24 + i),
  ),
  page,
  pageSize: 24,
  total: 26,
  hasMore: page === 0,
});
let client: QueryClient;
function browser(
  channel: "marketplace" | "shop" = "marketplace",
  initialCategory = "",
) {
  return (
    <QueryClientProvider client={client}>
      <CatalogueBrowser
        channel={channel}
        initialCategory={initialCategory}
        renderProduct={(p) => <p>{p.title}</p>}
      />
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  vi.mocked(cataloguePages.list).mockImplementation(async (_channel, filters) =>
    result(filters?.page),
  );
  vi.mocked(cataloguePages.categories).mockResolvedValue([
    { category: "Electronics", count: 77, image: "" },
    { category: "Furniture", count: 12, image: "" },
  ]);
});
afterEach(() => {
  cleanup();
  client.clear();
});
it("loads bounded pages and displays the server total and navigation state", async () => {
  render(browser());
  await screen.findByText("Showing 1-24 of 26 products");
  expect(screen.queryByText("Product 24")).toBeNull();
  expect(
    (screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText("Showing 25-26 of 26 products");
  expect(screen.queryByText("Product 0")).toBeNull();
  expect(
    (screen.getByRole("button", { name: "Next" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(cataloguePages.list).toHaveBeenLastCalledWith(
    "marketplace",
    expect.objectContaining({ page: 1, pageSize: 24 }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Previous" }));
  await screen.findByText("Product 0");
});
it("resets the page for search, price, category, sort, rating and stock changes", async () => {
  render(browser());
  await screen.findByText("Product 0");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText("Product 24");
  fireEvent.change(screen.getByLabelText("Search products"), {
    target: { value: "  kettle  " },
  });
  fireEvent.change(screen.getByLabelText("Minimum price (GBP)"), {
    target: { value: "5" },
  });
  fireEvent.change(screen.getByLabelText("Maximum price (GBP)"), {
    target: { value: "20" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Apply search and price" }),
  );
  await waitFor(() =>
    expect(cataloguePages.list).toHaveBeenLastCalledWith(
      "marketplace",
      expect.objectContaining({
        page: 0,
        q: "kettle",
        minPrice: 5,
        maxPrice: 20,
      }),
    ),
  );
  // Pagination stays disabled until the reset page has loaded.
  await screen.findByText("Product 0");
  for (const [label, value, field, expected] of [
    ["Category", "Furniture", "category", "Furniture"],
    ["Sort products", "price-desc", "sort", "price-desc"],
    ["Minimum rating", "4", "minRating", 4],
  ] as const) {
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Product 24");
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    await waitFor(() =>
      expect(cataloguePages.list).toHaveBeenLastCalledWith(
        "marketplace",
        expect.objectContaining({ page: 0, [field]: expected }),
      ),
    );
    await screen.findByText("Product 0");
  }
  fireEvent.click(screen.getByLabelText("In stock only"));
  await waitFor(() =>
    expect(cataloguePages.list).toHaveBeenLastCalledWith(
      "marketplace",
      expect.objectContaining({ page: 0, inStock: true, q: "kettle" }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  await waitFor(() =>
    expect(cataloguePages.list).toHaveBeenLastCalledWith("marketplace", {
      page: 0,
      pageSize: 24,
      sort: "newest",
    }),
  );
});
it("rejects a reversed price range without sending a query", async () => {
  render(browser());
  await screen.findByText("Product 0");
  const count = vi.mocked(cataloguePages.list).mock.calls.length;
  fireEvent.change(screen.getByLabelText("Minimum price (GBP)"), {
    target: { value: "20" },
  });
  fireEvent.change(screen.getByLabelText("Maximum price (GBP)"), {
    target: { value: "5" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Apply search and price" }),
  );
  expect(screen.getByRole("alert").textContent).toContain("valid price range");
  expect(cataloguePages.list).toHaveBeenCalledTimes(count);
});
it("retries failed pages without showing a false empty catalogue", async () => {
  vi.mocked(cataloguePages.list).mockRejectedValueOnce(new Error("offline"));
  render(browser());
  await screen.findByRole("alert");
  expect(screen.queryByText("0 products")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry products" }));
  await screen.findByText("Showing 1-24 of 26 products");
});
it("shows real full-category counts and responds to shop department link changes", async () => {
  const view = render(browser("shop", "wigs"));
  await screen.findByText("Product 0");
  expect(screen.getByRole("option", { name: "Electronics (77)" })).toBeTruthy();
  expect(cataloguePages.categories).toHaveBeenCalledWith("shop");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText("Product 24");
  view.rerender(browser("shop", "beauty"));
  await waitFor(() =>
    expect(cataloguePages.list).toHaveBeenLastCalledWith(
      "shop",
      expect.objectContaining({ category: "beauty", page: 0 }),
    ),
  );
});
it("keeps an out-of-range page recoverable after listings change", async () => {
  vi.mocked(cataloguePages.list).mockImplementation(
    async (_channel, filters) =>
      filters?.page ? { ...result(1), items: [], total: 1 } : result(),
  );
  render(browser());
  await screen.findByText("Product 0");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText("No products on this page (1 matching products).");
  fireEvent.click(screen.getByRole("button", { name: "First page" }));
  await screen.findByText("Product 0");
});
it("does not let a delayed prior-filter response replace the current results", async () => {
  let resolveOld!: (value: CataloguePage) => void;
  vi.mocked(cataloguePages.list).mockImplementation(
    async (_channel, filters) => {
      if (filters?.q === "old")
        return new Promise((resolve) => {
          resolveOld = resolve;
        });
      return result();
    },
  );
  render(browser());
  await screen.findByText("Product 0");
  fireEvent.change(screen.getByLabelText("Search products"), {
    target: { value: "old" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Apply search and price" }),
  );
  await screen.findByText("Loading products...");
  fireEvent.change(screen.getByLabelText("Search products"), {
    target: { value: "current" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Apply search and price" }),
  );
  await screen.findByText("Product 0");
  await act(async () =>
    resolveOld({
      ...result(),
      items: [{ ...product(99), title: "Stale result" }],
    }),
  );
  expect(screen.queryByText("Stale result")).toBeNull();
});
it("shows zero only after a successful empty response and retries categories separately", async () => {
  vi.mocked(cataloguePages.list).mockResolvedValue({
    ...result(),
    items: [],
    total: 0,
    hasMore: false,
  });
  vi.mocked(cataloguePages.categories)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue([]);
  render(browser());
  await screen.findByText("0 products");
  fireEvent.click(
    await screen.findByRole("button", { name: "Retry categories" }),
  );
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});
