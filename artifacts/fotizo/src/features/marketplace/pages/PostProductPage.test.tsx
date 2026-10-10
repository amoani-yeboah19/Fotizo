// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import PostProductPage from "./PostProductPage";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  categories: {
    data: [
      { id: "c1", name: "Men's Clothing", icon: "", count: 1 },
      { id: "c2", name: "Wigs & Hair", icon: "", count: 1 },
    ],
  },
  owned: {
    data: {
      id: "p1",
      title: "Hooded puffer jacket",
      category: "Men's Clothing",
      description: "Warm hooded puffer jacket with a zip front.",
      price: 42,
      originalPrice: null,
      stockCount: 0,
      status: "unpublished",
      images: ["/images/jacket.webp"],
      tags: ["winter"],
      specs: { Material: "Nylon", department: "mens", shopId: "s1", unitsSold: "40", priceRange: "¥80-90" },
    },
    isLoading: false,
    isError: false,
  },
}));
vi.mock("wouter", () => ({
  useRoute: (path: string) =>
    path.startsWith("/dashboard/china_representative") ? [true, { id: "p1" }] : [false, null],
  useLocation: () => ["", vi.fn()],
}));
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Desk", role: "china_representative" } }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/common/Price", () => ({ Price: () => null }));
// An imported shop listing: its category is one of the server's categories and
// its specs carry the shop's own data next to the owner's.
vi.mock("@/features/marketplace/hooks", () => ({
  useCategories: () => mocks.categories,
  useCreateProduct: () => ({ mutateAsync: vi.fn() }),
  useUpdateProduct: () => ({ mutateAsync: mocks.update }),
  useOwnedProduct: () => mocks.owned,
}));
afterEach(cleanup);

it("fills an imported listing's category and keeps the shop's own data out of the specifications", async () => {
  mocks.update.mockResolvedValue({ title: "Hooded puffer jacket" });
  render(<PostProductPage />);
  const category = screen.getByLabelText(/Category/) as HTMLSelectElement;
  await waitFor(() => expect(category.value).toBe("Men's Clothing"));
  expect([...category.options].map((o) => o.value)).toContain("Wigs & Hair");

  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByLabelText(/Stock quantity/);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByDisplayValue("Material");
  expect(screen.getByDisplayValue("Nylon")).toBeTruthy();
  expect(screen.queryByDisplayValue("shopId")).toBeNull();
  expect(screen.queryByDisplayValue("unitsSold")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(await screen.findByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalled());
  expect(mocks.update.mock.calls[0][0].input).toMatchObject({
    category: "Men's Clothing",
    specs: { Material: "Nylon" },
    status: "unpublished",
  });
  expect(Object.keys(mocks.update.mock.calls[0][0].input.specs)).toEqual(["Material"]);
});
