import { api } from "@/api";

export interface SavedCartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  image: string;
  seller: string;
  quantity: number;
  /** The colour, size and so on chosen for this line. */
  options?: string;
}

const optionsQuery = (options?: string) => (options ? `?options=${encodeURIComponent(options)}` : "");

// The signed-in account's cart on the server (/api/cart). Signed-out carts are
// kept in the browser by CartContext and merged in here on sign-in.
export const cartService = {
  list: () => api.get<SavedCartItem[]>("/cart"),
  setQuantity: (productId: string, quantity: number, options?: string) =>
    api.put<void>(`/cart/items/${productId}`, { quantity, ...(options ? { options } : {}) }),
  remove: (productId: string, options?: string) =>
    api.del<void>(`/cart/items/${productId}${optionsQuery(options)}`),
  clear: () => api.del<void>("/cart"),
  merge: (items: { productId: string; quantity: number; options?: string }[]) =>
    api.post<SavedCartItem[]>("/cart/merge", { items }),
};
