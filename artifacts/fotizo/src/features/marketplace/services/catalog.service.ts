import { cataloguePages } from "./catalogue-page";
import { api, CATALOG_USE_MOCKS, SELLER_CATALOG_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type {
  Product,
  Category,
  SellerProduct,
  NewProductInput,
} from "@/types";

// Production classification is enforced by the API, not display names.
function localOnly(products: Product[]): Product[] {
  return products.filter((p) => p.channel !== "shop");
}

export const catalogService = {
  async getOwnedProduct(id: string): Promise<Product | null> {
    if (SELLER_CATALOG_USE_MOCKS)
      return fx.products.find((p) => p.id === id) ?? null;
    return api.get<Product>(`/seller/products/${id}`);
  },
  async createProduct(input: NewProductInput): Promise<Product> {
    if (SELLER_CATALOG_USE_MOCKS) {
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
        rating: 0,
        reviewCount: 0,
        status: input.stockCount > 0 ? "active" : "out_of_stock",
        image: product.image,
        category: input.category,
      });
      return product;
    }
    return api.post<Product>("/products", input);
  },

  // Home/dashboard recommendations intentionally request a small preview.
  async listProducts(): Promise<Product[]> {
    return (await cataloguePages.list("marketplace", { pageSize: 10 })).items;
  },

  async getProduct(id: string): Promise<Product | null> {
    if (CATALOG_USE_MOCKS) {
      await delay();
      return fx.products.find((p) => p.id === id) ?? null;
    }
    // Mixed config (demo): a real public catalog alongside a mocked seller
    // dashboard, so an id can belong to either side. Check the fixtures first —
    // the seller's edit flow passes mock ids, and a real lookup would 404 on them.
    if (SELLER_CATALOG_USE_MOCKS) {
      const seeded = fx.products.find((p) => p.id === id);
      if (seeded) return seeded;
    }
    return api.get<Product>(`/products/${id}`);
  },

  async getRelatedProducts(id: string): Promise<Product[]> {
    if (CATALOG_USE_MOCKS) {
      await delay();
      const product = fx.products.find((p) => p.id === id);
      if (!product) return [];
      return localOnly(fx.products)
        .filter((p) => p.category === product.category && p.id !== id)
        .slice(0, 3);
    }
    // "Related" on a seller listing must stay local too, or the shop leaks back
    // in through the bottom of the product page.
    return localOnly(await api.get<Product[]>(`/products/${id}/related`));
  },

  async listCategories(): Promise<Category[]> {
    if (CATALOG_USE_MOCKS) {
      await delay();
      return fx.categories;
    }
    return api.get<Category[]>("/categories");
  },

  async listSellerProducts(): Promise<SellerProduct[]> {
    if (SELLER_CATALOG_USE_MOCKS) {
      await delay();
      return fx.sellerProducts;
    }
    return api.get<SellerProduct[]>("/seller/products");
  },

  async updateProduct(
    id: string,
    input: Partial<NewProductInput> & { status?: "active" | "unpublished" },
  ): Promise<Product> {
    if (SELLER_CATALOG_USE_MOCKS) {
      await delay();
      const idx = fx.products.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Product not found.");
      const updated: Product = {
        ...fx.products[idx],
        ...input,
        image: input.images ? (input.images[0] ?? "") : fx.products[idx].image,
        inStock: (input.stockCount ?? fx.products[idx].stockCount) > 0,
      };
      fx.products[idx] = updated;
      const sIdx = fx.sellerProducts.findIndex((p) => p.id === id);
      if (sIdx !== -1) {
        fx.sellerProducts[sIdx] = {
          ...fx.sellerProducts[sIdx],
          title: updated.title,
          price: updated.price,
          stock: updated.stockCount,
          image: updated.image,
          category: updated.category,
        };
      }
      return updated;
    }
    return api.patch<Product>(`/products/${id}`, input);
  },

  // Soft delete — hides the listing from the catalog rather than erasing it.
  async deleteProduct(id: string): Promise<void> {
    if (SELLER_CATALOG_USE_MOCKS) {
      await delay();
      const idx = fx.products.findIndex((p) => p.id === id);
      if (idx !== -1) fx.products.splice(idx, 1);
      const sIdx = fx.sellerProducts.findIndex((p) => p.id === id);
      if (sIdx !== -1)
        fx.sellerProducts[sIdx] = {
          ...fx.sellerProducts[sIdx],
          status: "unpublished",
        };
      return;
    }
    await api.del(`/products/${id}`);
  },
};
