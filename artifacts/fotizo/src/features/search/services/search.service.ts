import { api, CATALOG_USE_MOCKS } from "@/api";
import type { Product, Service } from "@/types";
import type { ShopProduct } from "@/features/shop/data/shop-product";
import { toShopProduct } from "@/features/shop/services";
import { autosService } from "@/features/autos/services/autos.service";
import type { Vehicle } from "@/features/autos/data/vehicles";

export interface SearchGroup<T> {
  items: T[];
  /** All matches, of which `items` are the best few. */
  total: number;
}

export interface GlobalSearchResults {
  q: string;
  products: SearchGroup<Product>;
  shop: SearchGroup<ShopProduct>;
  services: SearchGroup<Service>;
  vehicles: SearchGroup<Vehicle>;
}

/** Searches start at two characters, matching the server. */
export const MIN_SEARCH_LENGTH = 2;

const group = <T,>(all: T[], limit: number): SearchGroup<T> => ({ items: all.slice(0, limit), total: all.length });
const matches = (q: string, ...values: (string | undefined)[]) =>
  values.some((v) => v?.toLowerCase().includes(q.toLowerCase()));

export const searchService = {
  /** Marketplace products, Fotizo Shop items, services and vehicles in one call. */
  async global(q: string, limit = 4): Promise<GlobalSearchResults> {
    if (CATALOG_USE_MOCKS) {
      // Demo builds search their sample data in the browser, loaded on demand.
      const [fx, { loadLocalCatalogue }, vehicles] = await Promise.all([
        import("@/services/mocks/fixtures"),
        import("@/features/shop/data/local-catalogue"),
        autosService.listVehicles(),
      ]);
      const shopProducts = await loadLocalCatalogue();
      return {
        q,
        products: group(fx.products.filter((p) => matches(q, p.title, p.seller, p.category)), limit),
        shop: group(shopProducts.filter((p) => matches(q, p.title, p.category)), limit),
        services: group(fx.services.filter((s) => matches(q, s.title, s.provider, s.category, ...s.skills)), limit),
        vehicles: group(vehicles.filter((v) => matches(q, `${v.make} ${v.model}`, v.bodyType, v.fuel)), limit),
      };
    }
    const result = await api.get<Omit<GlobalSearchResults, "shop"> & { shop: SearchGroup<Product> }>("/search", {
      q,
      limit,
    });
    return { ...result, shop: { ...result.shop, items: result.shop.items.map(toShopProduct) } };
  },
};

/** Where each kind of result opens, and where its full, filterable list lives. */
export const searchLinks = {
  product: (p: Product) => `/products/${p.id}`,
  shop: (p: ShopProduct) => `/shop/${p.id}`,
  service: (s: Service) => `/services/${s.id}`,
  vehicle: (v: Vehicle) => `/autos/${v.slug}`,
  all: {
    products: (q: string) => `/products?q=${encodeURIComponent(q)}`,
    shop: (q: string) => `/shop?q=${encodeURIComponent(q)}`,
    services: (q: string) => `/services?q=${encodeURIComponent(q)}`,
    vehicles: () => "/autos",
  },
  page: (q: string) => `/search?q=${encodeURIComponent(q)}`,
};
