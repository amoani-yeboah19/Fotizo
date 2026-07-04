import { api, USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { Product, Category, SellerProduct, NewProductInput } from "@/types";

export const catalogService = {
  async createProduct(input: NewProductInput): Promise<Product> {
    if (USE_MOCKS) {
      await delay();
      const id = `p-${Date.now()}`;
      const product: Product = {
        id,
        title: input.title,
        description: input.description,
        price: input.price,
        originalPrice: input.originalPrice,
        rating: 0,
        reviewCount: 0,
        seller: input.seller,
        sellerId: input.sellerId,
        category: input.category,
        image: input.images[0] ?? "",
        images: input.images,
        inStock: input.stockCount > 0,
        stockCount: input.stockCount,
        tags: input.tags,
        specs: input.specs,
      };
      // Prepend so it shows first in the catalog and the seller's dashboard list.
      fx.products.unshift(product);
      fx.sellerProducts.unshift({
        id,
        title: input.title,
        price: input.price,
        stock: input.stockCount,
        sales: 0,
        status: input.stockCount > 0 ? "active" : "out_of_stock",
        image: product.image,
        category: input.category,
      });
      return product;
    }
    return api.post<Product>("/products", input);
  },

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
