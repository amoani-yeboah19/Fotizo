import { api, USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { Product, Category, SellerProduct } from "@/types";

export const catalogService = {
  async listProducts(): Promise<Product[]> {
    if (USE_MOCKS) {
      await delay();
      return fx.products;
    }
    return api.get<Product[]>("/products");
  },

  async getProduct(id: string): Promise<Product | null> {
    if (USE_MOCKS) {
      await delay();
      return fx.products.find((p) => p.id === id) ?? null;
    }
    return api.get<Product>(`/products/${id}`);
  },

  async getRelatedProducts(id: string): Promise<Product[]> {
    if (USE_MOCKS) {
      await delay();
      const product = fx.products.find((p) => p.id === id);
      if (!product) return [];
      return fx.products
        .filter((p) => p.category === product.category && p.id !== id)
        .slice(0, 3);
    }
    return api.get<Product[]>(`/products/${id}/related`);
  },

  async listCategories(): Promise<Category[]> {
    if (USE_MOCKS) {
      await delay();
      return fx.categories;
    }
    return api.get<Category[]>("/categories");
  },

  async listSellerProducts(): Promise<SellerProduct[]> {
    if (USE_MOCKS) {
      await delay();
      return fx.sellerProducts;
    }
    return api.get<SellerProduct[]>("/seller/products");
  },
};
