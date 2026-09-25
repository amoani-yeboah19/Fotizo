// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ProductCard } from "@/features/marketplace/components/ProductCard";
import { wishlistService } from "./services/wishlist.service";
import { ApiError } from "@/api/client";

const session = vi.hoisted(() => ({ signedIn: true }));
const openAuth = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: session.signedIn ? { id: "buyer-1", role: "buyer" } : null,
    isAuthenticated: session.signedIn,
  }),
}));
vi.mock("@/contexts/AuthModalContext", () => ({ useAuthModal: () => openAuth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
const addItem = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/CartContext", () => ({ useCart: () => ({ addItem }) }));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ format: (n: number) => `£${n.toFixed(2)}` }),
}));
vi.mock("wouter", () => ({
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
  useLocation: () => ["/products/p1", vi.fn()],
}));
vi.mock("./services/wishlist.service", () => ({
  wishlistService: { list: vi.fn(), add: vi.fn(), remove: vi.fn() },
}));

const product = {
  id: "p1",
  title: "Kettle",
  price: 20,
  originalPrice: null,
  rating: 4,
  reviewCount: 2,
  seller: "Ama",
  category: "Home",
  image: "",
};

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <ProductCard product={product} />
    </QueryClientProvider>,
  );
}
const heart = () => screen.getByRole("button", { name: /wishlist/ });

beforeEach(() => {
  vi.resetAllMocks();
  session.signedIn = true;
  vi.mocked(wishlistService.list).mockResolvedValue([]);
});
afterEach(cleanup);

it("asks a signed-out visitor to sign in and returns them to the same page", () => {
  session.signedIn = false;
  mount();
  fireEvent.click(heart());
  expect(openAuth).toHaveBeenCalledWith("signin", "/products/p1");
  expect(wishlistService.add).not.toHaveBeenCalled();
});

it("saves a product and shows the heart as saved straight away", async () => {
  vi.mocked(wishlistService.add).mockResolvedValue();
  mount();
  await waitFor(() => expect(wishlistService.list).toHaveBeenCalled());
  // The refetch after saving returns the server's list, which now includes it.
  vi.mocked(wishlistService.list).mockResolvedValue([product] as never);
  fireEvent.click(heart());
  await waitFor(() => expect(heart().getAttribute("aria-pressed")).toBe("true"));
  expect(heart().getAttribute("aria-label")).toBe("Remove from wishlist");
  expect(wishlistService.add).toHaveBeenCalledWith("p1");
});

it("removes a saved product", async () => {
  vi.mocked(wishlistService.list).mockResolvedValue([product] as never);
  vi.mocked(wishlistService.remove).mockResolvedValue();
  mount();
  await waitFor(() => expect(heart().getAttribute("aria-pressed")).toBe("true"));
  vi.mocked(wishlistService.list).mockResolvedValue([]);
  fireEvent.click(heart());
  await waitFor(() => expect(heart().getAttribute("aria-pressed")).toBe("false"));
  expect(wishlistService.remove).toHaveBeenCalledWith("p1");
});

it("rolls back and explains when the server refuses", async () => {
  vi.mocked(wishlistService.add).mockRejectedValue(
    new ApiError(409, "Conflict", { error: "Your wishlist can hold up to 500 products." }, "/x"),
  );
  mount();
  await waitFor(() => expect(wishlistService.list).toHaveBeenCalled());
  fireEvent.click(heart());
  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Your wishlist can hold up to 500 products." }),
    ),
  );
  await waitFor(() => expect(heart().getAttribute("aria-pressed")).toBe("false"));
});

it("adds an in-stock marketplace product to the cart from its card", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
  expect(addItem).toHaveBeenCalledWith(
    expect.objectContaining({ productId: "p1", title: "Kettle", price: 20, seller: "Ama" }),
  );
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Added to cart" }));
});

it("refuses a sold-out marketplace product with a visible message", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProductCard product={{ ...product, inStock: false }} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
  expect(addItem).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Out of stock" }));
});
