import { api, AUTH_USE_MOCKS } from "@/api";
import type { Product } from "@/types";

// Saved products live on the server per account (GET/PUT/DELETE /api/wishlist).
// Demo builds have no session, so they cannot save anything.
export const wishlistService = {
  async list(): Promise<Product[]> {
    if (AUTH_USE_MOCKS) return [];
    return api.get<Product[]>("/wishlist");
  },
  async add(productId: string): Promise<void> {
    if (AUTH_USE_MOCKS) throw new Error("The wishlist is unavailable in demo mode.");
    await api.put(`/wishlist/${productId}`);
  },
  async remove(productId: string): Promise<void> {
    if (AUTH_USE_MOCKS) throw new Error("The wishlist is unavailable in demo mode.");
    await api.del(`/wishlist/${productId}`);
  },
};
