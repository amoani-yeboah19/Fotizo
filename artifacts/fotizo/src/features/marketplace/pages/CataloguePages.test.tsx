// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import ShopPage from "@/features/shop/pages/ShopPage";
import ProductsPage from "./ProductsPage";
import { cataloguePages, type CataloguePage } from "../services/catalogue-page";
import type { CatalogueProduct } from "@workspace/api-client-react";

const location = vi.hoisted(() => ({ search: "" }));
vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
  useSearch: () => location.search,
}));
vi.mock("../services/catalogue-page", () => ({
  cataloguePages: { list: vi.fn(), categories: vi.fn() },
}));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/features/shop/components/ChinaMarketDialog", () => ({ ChinaMarketDialog: () => null }));
vi.mock("@/features/shop/components/ShopProductCard", () => ({
  ShopProductCard: ({ product }: { product: { title: string } }) => <p>{product.title}</p>,
}));
vi.mock("../components/ProductCard", () => ({
  ProductCard: ({ product }: { product: { title: string } }) => <p>{product.title}</p>,
}));

const product = (i: number, channel: "shop" | "marketplace"): CatalogueProduct => ({
  id: `${channel}-${i}`,
  title: `${channel} item ${i}`,
  description: "",
  price: 10,
  originalPrice: 12,
  rating: 4,
  reviewCount: 0,
  seller: "Seller",
  sellerId: "seller",
  category: "phones",
  channel,
  status: "active",
  image: "",
  images: [],
  inStock: true,
  stockCount: 3,
  tags: [],
  specs: { department: "phones", unitsSold: "12" },
});
const page = (channel: "shop" | "marketplace", pageNo: number, total: number): CataloguePage => {
  const count = Math.max(0, Math.min(48, total - pageNo * 48));
  return {
    items: Array.from({ length: count }, (_, i) => product(pageNo * 48 + i, channel)),
    page: pageNo,
    pageSize: 48,
    total,
    hasMore: (pageNo + 1) * 48 < total,
  };
};

function mount(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  vi.resetAllMocks();
  // The price slider measures itself; jsdom has no ResizeObserver.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  location.search = "";
  vi.mocked(cataloguePages.list).mockImplementation(async (channel, filters) =>
    page(channel, filters?.page ?? 0, filters?.discounted ? 3 : 60),
  );
  vi.mocked(cataloguePages.categories).mockResolvedValue([
    { category: "phones", count: 17, image: "" },
    { category: "appliances", count: 30, image: "" },
  ]);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("loads the shop department from the link and shows the server total", async () => {
  location.search = "?category=phones";
  mount(<ShopPage />);
  await screen.findByText("(60)");
  expect(cataloguePages.list).toHaveBeenCalledWith(
    "shop",
    expect.objectContaining({ category: "phones", sort: "newest", page: 0, pageSize: 48 }),
  );
});

it("maps shop sorting and debounced search to server queries", async () => {
  mount(<ShopPage />);
  await screen.findByText("(60)");
  // Lightning deals come from the most-discounted published items.
  expect(cataloguePages.list).toHaveBeenCalledWith(
    "shop",
    expect.objectContaining({ discounted: true, sort: "discount", pageSize: 12 }),
  );
  fireEvent.change(screen.getByLabelText("Sort products"), { target: { value: "best-selling" } });
  await waitFor(() =>
    expect(cataloguePages.list).toHaveBeenLastCalledWith(
      "shop",
      expect.objectContaining({ sort: "best-selling", page: 0 }),
    ),
  );
  fireEvent.change(screen.getByLabelText("Search the shop"), { target: { value: " kettle " } });
  await waitFor(() =>
    expect(cataloguePages.list).toHaveBeenLastCalledWith(
      "shop",
      expect.objectContaining({ q: "kettle", page: 0 }),
    ),
  );
});

it("appends the next shop page when the end of the grid scrolls into view", async () => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private cb: (e: { isIntersecting: boolean }[]) => void) {}
      observe() {
        this.cb([{ isIntersecting: true }]);
      }
      disconnect() {}
    },
  );
  mount(<ShopPage />);
  await screen.findByText("shop item 59");
  // Items 3-47 appear only in the first grid page (deals show items 0-2).
  expect(screen.getByText("shop item 47")).toBeTruthy();
  expect(cataloguePages.list).toHaveBeenCalledWith("shop", expect.objectContaining({ page: 1 }));
});

it("drives marketplace filters, sort and counts from the server", async () => {
  mount(<ProductsPage />);
  await screen.findByText("Showing 60 products");
  // Sidebar categories are the real marketplace counts, largest first.
  const labels = screen.getAllByRole("checkbox").map((c) => c.parentElement?.textContent);
  expect(labels).toEqual(["Home Appliances(30)", "Phones(17)"]);
  fireEvent.click(screen.getAllByRole("checkbox")[1]);
  await waitFor(() =>
    expect(cataloguePages.list).toHaveBeenLastCalledWith(
      "marketplace",
      expect.objectContaining({ category: "phones", page: 0 }),
    ),
  );
  fireEvent.change(screen.getByLabelText("Sort products"), { target: { value: "Price: Low to High" } });
  fireEvent.click(screen.getByRole("switch"));
  await waitFor(() =>
    expect(cataloguePages.list).toHaveBeenLastCalledWith(
      "marketplace",
      expect.objectContaining({ category: "phones", sort: "price-asc", inStock: true }),
    ),
  );
});

it("shows the marketplace error state instead of an empty catalogue", async () => {
  vi.mocked(cataloguePages.list).mockRejectedValue(new Error("offline"));
  mount(<ProductsPage />);
  await screen.findByText("Something went wrong. Please try again.");
  expect(screen.queryByText("No seller listings yet")).toBeNull();
});
