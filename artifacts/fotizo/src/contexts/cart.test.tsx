// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "./CartContext";
import { cartService } from "@/services/cart.service";

const session = vi.hoisted(() => ({ user: null as null | { id: string }, status: "anonymous" }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => session }));
vi.mock("@/api", () => ({ AUTH_USE_MOCKS: false }));
vi.mock("@/services/cart.service", () => ({
  cartService: { list: vi.fn(), merge: vi.fn(), setQuantity: vi.fn(), remove: vi.fn(), clear: vi.fn() },
}));

const kettle = { id: "p1", productId: "p1", title: "Kettle", price: 20, image: "", seller: "Ama" };

function Probe() {
  const cart = useCart();
  return (
    <div>
      <span data-testid="count">{cart.count}</span>
      <span data-testid="loaded">{String(cart.isLoaded)}</span>
      <button onClick={() => cart.addItem(kettle)}>add</button>
      <button onClick={() => cart.updateQuantity("p1", 5)}>five</button>
      <button onClick={() => cart.removeItem("p1")}>remove</button>
    </div>
  );
}
const count = () => screen.getByTestId("count").textContent;

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  session.user = null;
  session.status = "anonymous";
  vi.mocked(cartService.setQuantity).mockResolvedValue(undefined);
  vi.mocked(cartService.remove).mockResolvedValue(undefined);
});
afterEach(cleanup);

it("keeps a signed-out cart in this browser across reloads", async () => {
  const first = render(<CartProvider><Probe /></CartProvider>);
  fireEvent.click(screen.getByText("add"));
  fireEvent.click(screen.getByText("add"));
  expect(count()).toBe("2");
  first.unmount();
  render(<CartProvider><Probe /></CartProvider>);
  await waitFor(() => expect(count()).toBe("2"));
  expect(cartService.setQuantity).not.toHaveBeenCalled();
});

it("merges the signed-out cart into the account on sign-in and clears the browser copy", async () => {
  localStorage.setItem("fotizo.cart.guest", JSON.stringify([{ ...kettle, quantity: 2 }]));
  session.user = { id: "u1" };
  session.status = "authenticated";
  vi.mocked(cartService.merge).mockResolvedValue([{ ...kettle, quantity: 3 }]);
  render(<CartProvider><Probe /></CartProvider>);
  expect(screen.getByTestId("loaded").textContent).toBe("false");
  await waitFor(() => expect(count()).toBe("3"));
  expect(cartService.merge).toHaveBeenCalledWith([{ productId: "p1", quantity: 2 }]);
  expect(localStorage.getItem("fotizo.cart.guest")).toBeNull();
  expect(screen.getByTestId("loaded").textContent).toBe("true");
});

it("loads the account's saved cart and saves each change in order", async () => {
  session.user = { id: "u1" };
  session.status = "authenticated";
  vi.mocked(cartService.list).mockResolvedValue([{ ...kettle, quantity: 1 }]);
  const order: string[] = [];
  vi.mocked(cartService.setQuantity).mockImplementation(async (_id, q) => {
    await new Promise((r) => setTimeout(r, q === 2 ? 20 : 0));
    order.push(`set:${q}`);
  });
  vi.mocked(cartService.remove).mockImplementation(async () => {
    order.push("remove");
  });
  render(<CartProvider><Probe /></CartProvider>);
  await waitFor(() => expect(count()).toBe("1"));
  fireEvent.click(screen.getByText("add"));
  fireEvent.click(screen.getByText("five"));
  fireEvent.click(screen.getByText("remove"));
  expect(count()).toBe("0");
  await waitFor(() => expect(order).toEqual(["set:2", "set:5", "remove"]));
  // Signed-in carts are not written to browser storage.
  expect(localStorage.getItem("fotizo.cart.guest")).toBeNull();
});

it("shows the server's cart again when saving a change fails", async () => {
  session.user = { id: "u1" };
  session.status = "authenticated";
  vi.mocked(cartService.list)
    .mockResolvedValueOnce([{ ...kettle, quantity: 1 }])
    .mockResolvedValueOnce([{ ...kettle, quantity: 1 }]);
  vi.mocked(cartService.setQuantity).mockRejectedValue(new Error("offline"));
  render(<CartProvider><Probe /></CartProvider>);
  await waitFor(() => expect(count()).toBe("1"));
  await act(async () => {
    fireEvent.click(screen.getByText("add"));
  });
  await waitFor(() => expect(cartService.list).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(count()).toBe("1"));
});
