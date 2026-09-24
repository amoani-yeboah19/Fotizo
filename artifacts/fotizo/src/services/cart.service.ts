import { api } from "@/api";

export interface SavedCartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  image: string;
  seller: string;
  quantity: number;
}

// The signed-in account's cart on the server (/api/cart). Signed-out carts are
// kept in the browser by CartContext and merged in here on sign-in.
export const cartService = {
  list: () => api.get<SavedCartItem[]>("/cart"),
  setQuantity: (productId: string, quantity: number) =>
    api.put<void>(`/cart/items/${productId}`, { quantity }),
  remove: (productId: string) => api.del<void>(`/cart/items/${productId}`),
  clear: () => api.del<void>("/cart"),
  merge: (items: { productId: string; quantity: number }[]) =>
    api.post<SavedCartItem[]>("/cart/merge", { items }),
};
