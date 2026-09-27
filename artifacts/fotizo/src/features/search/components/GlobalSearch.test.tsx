// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalSearch } from "./GlobalSearch";
import { searchService, type GlobalSearchResults } from "../services/search.service";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("wouter", () => ({ useLocation: () => ["/", navigate] }));
vi.mock("@/contexts/CurrencyContext", () => ({ useCurrency: () => ({ format: (n: number) => `£${n.toFixed(2)}` }) }));
vi.mock("../services/search.service", async (original) => ({
  ...(await original<typeof import("../services/search.service")>()),
  searchService: { global: vi.fn() },
}));

const empty = { items: [], total: 0 };
const results = {
  q: "drill",
  products: { items: [{ id: "p1", title: "Cordless drill", seller: "Ama", image: "", price: 120 }], total: 5 },
  shop: { items: [{ id: "s1", title: "Drill bits", category: "Tools", image: "", price: 9 }], total: 1 },
  services: empty,
  vehicles: empty,
} as unknown as GlobalSearchResults;

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <GlobalSearch />
    </QueryClientProvider>,
  );
  return screen.getByRole("combobox", { name: "Search products and services" });
}
beforeEach(() => vi.mocked(searchService.global).mockResolvedValue(results));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("suggests matches from every section and opens the full results on Enter", async () => {
  const input = mount();
  fireEvent.change(input, { target: { value: "drill" } });
  expect(await screen.findByRole("option", { name: /Cordless drill/ })).toBeTruthy();
  expect(screen.getByText("Products")).toBeTruthy();
  expect(screen.getByText("Fotizo Shop")).toBeTruthy();
  expect(screen.getByText("See all 6 results for “drill”")).toBeTruthy();
  expect(searchService.global).toHaveBeenCalledWith("drill", 3);
  fireEvent.submit(input.closest("form")!);
  expect(navigate).toHaveBeenCalledWith("/search?q=drill");
});

it("opens a suggestion chosen with the keyboard", async () => {
  const input = mount();
  fireEvent.change(input, { target: { value: "drill" } });
  await screen.findByRole("option", { name: /Drill bits/ });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(screen.getByRole("option", { name: /Drill bits/ }).getAttribute("aria-selected")).toBe("true");
  fireEvent.submit(input.closest("form")!);
  expect(navigate).toHaveBeenCalledWith("/shop/s1");
});

it("waits for two characters and says when nothing matches", async () => {
  vi.mocked(searchService.global).mockResolvedValue({ q: "zz", products: empty, shop: empty, services: empty, vehicles: empty });
  const input = mount();
  fireEvent.change(input, { target: { value: "z" } });
  fireEvent.submit(input.closest("form")!);
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "zz" } });
  await waitFor(() => expect(screen.getByText("No results for “zz”.")).toBeTruthy());
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
});
