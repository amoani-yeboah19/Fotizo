import type { LucideIcon } from "lucide-react";
import { Glasses, Gem, Droplets, Shirt, Crown, ShoppingBag, Footprints, Sparkles, Watch } from "lucide-react";

// Temu/Taobao-style storefront for Fotizo's imported (China-sourced) product
// line. This is curated placeholder data — prices are in the app's base currency
// (the Price component converts to the active one), and images come from a
// keyword image service so the grid looks like a real catalog until the
// supplier's real feed is imported. Swap `productImage()` to change the source.

export interface ShopCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  /** keyword(s) used to fetch topical placeholder imagery */
  keyword: string;
}

export interface ShopProduct {
  id: string;
  title: string;
  category: string;
  price: number;
  originalPrice: number;
  rating: number;
  sold: number;
  image: string;
  images: string[];
  freeShipping: boolean;
  almostGone: boolean;
  description: string;
}

// Stable, topical placeholder image. `lock` keeps the same photo per product.
function productImage(keyword: string, lock: number): string {
  return `https://loremflickr.com/600/600/${encodeURIComponent(keyword)}?lock=${lock}`;
}

interface CatTemplate {
  label: string;
  icon: LucideIcon;
  keyword: string;
  low: number;
  high: number;
  names: string[];
}

const CATALOG: Record<string, CatTemplate> = {
  accessories: {
    label: "Accessories",
    icon: Glasses,
    keyword: "accessory,fashion",
    low: 4,
    high: 22,
    names: [
      "Retro Round Sunglasses",
      "Minimalist Leather Belt",
      "Silk Twill Neck Scarf",
      "Woven Straw Sun Hat",
      "Classic Aviator Sunglasses",
      "Adjustable Canvas Cap",
    ],
  },
  jewellery: {
    label: "Jewellery",
    icon: Gem,
    keyword: "jewelry",
    low: 6,
    high: 38,
    names: [
      "18K Gold-Plated Hoop Earrings",
      "Sterling Silver Pendant Necklace",
      "Cubic Zirconia Tennis Bracelet",
      "Minimalist Stacking Rings Set",
      "Freshwater Pearl Drop Earrings",
      "Layered Chain Choker",
    ],
  },
  perfumes: {
    label: "Perfumes",
    icon: Droplets,
    keyword: "perfume",
    low: 9,
    high: 42,
    names: [
      "Amber Oud Eau de Parfum 50ml",
      "Fresh Citrus Cologne 100ml",
      "Rose Musk Body Mist 200ml",
      "Velvet Vanilla Perfume 30ml",
      "Ocean Breeze EDT 75ml",
      "Sandalwood Attar Oil 12ml",
    ],
  },
  mens: {
    label: "Men's Wear",
    icon: Shirt,
    keyword: "menswear,fashion",
    low: 12,
    high: 56,
    names: [
      "Slim-Fit Oxford Shirt",
      "Merino Wool Crewneck Sweater",
      "Tapered Stretch Chinos",
      "Quilted Bomber Jacket",
      "Cotton Piqué Polo Shirt",
      "Washed Denim Jeans",
    ],
  },
  womens: {
    label: "Women's Wear",
    icon: Crown,
    keyword: "dress,fashion",
    low: 11,
    high: 52,
    names: [
      "Pleated Chiffon Midi Dress",
      "Ribbed Knit Cardigan",
      "High-Waist Wide-Leg Trousers",
      "Satin Slip Camisole",
      "Oversized Tailored Blazer",
      "Floral Wrap Blouse",
    ],
  },
  bags: {
    label: "Bags",
    icon: ShoppingBag,
    keyword: "handbag",
    low: 10,
    high: 60,
    names: [
      "Quilted Chain Crossbody Bag",
      "Canvas Tote Shopper",
      "Mini Leather Backpack",
      "Structured Top-Handle Bag",
      "Nylon Belt Bag",
      "Woven Bucket Bag",
    ],
  },
  shoes: {
    label: "Shoes",
    icon: Footprints,
    keyword: "shoes",
    low: 14,
    high: 48,
    names: [
      "Chunky Platform Sneakers",
      "Pointed-Toe Ballet Flats",
      "Suede Chelsea Boots",
      "Strappy Block Heels",
      "Canvas Slip-On Shoes",
      "Padded Slide Sandals",
    ],
  },
  beauty: {
    label: "Beauty",
    icon: Sparkles,
    keyword: "cosmetics,makeup",
    low: 4,
    high: 30,
    names: [
      "Matte Liquid Lipstick Set",
      "Hydrating Sheet Mask (10 pack)",
      "Volumizing Lash Mascara",
      "Jade Facial Roller",
      "Nourishing Tinted Lip Oil",
      "Full-Coverage Foundation",
    ],
  },
  watches: {
    label: "Watches",
    icon: Watch,
    keyword: "watch",
    low: 16,
    high: 72,
    names: [
      "Minimalist Mesh-Strap Watch",
      "Chronograph Sports Watch",
      "Rose-Gold Bangle Watch",
      "Digital LED Watch",
      "Leather-Strap Dress Watch",
      "Smart Fitness Tracker Watch",
    ],
  },
};

export const SHOP_CATEGORIES: ShopCategory[] = Object.entries(CATALOG).map(
  ([id, c]) => ({ id, label: c.label, icon: c.icon, keyword: c.keyword }),
);

const SOLD_STEPS = [64, 128, 312, 540, 890, 1200, 2600, 4300, 6800, 9500];
const DISCOUNTS = [0.35, 0.45, 0.52, 0.4, 0.6, 0.48];

// Build the flat product list from the templates above.
export const SHOP_PRODUCTS: ShopProduct[] = Object.entries(CATALOG).flatMap(
  ([catId, c]) =>
    c.names.map((name, i) => {
      const span = c.high - c.low;
      const originalPrice = Math.round((c.low + (span * (i + 1)) / c.names.length) * 100) / 100;
      const discount = DISCOUNTS[i % DISCOUNTS.length];
      const price = Math.round(originalPrice * (1 - discount) * 100) / 100;
      const lock = catId.length * 100 + i * 7 + 11;
      const globalIdx = Object.keys(CATALOG).indexOf(catId) * 6 + i;
      return {
        id: `${catId}-${i + 1}`,
        title: name,
        category: catId,
        price,
        originalPrice,
        rating: Math.min(5, Math.round((4.3 + ((globalIdx % 7) * 0.1)) * 10) / 10),
        sold: SOLD_STEPS[globalIdx % SOLD_STEPS.length],
        image: productImage(c.keyword, lock),
        images: [
          productImage(c.keyword, lock),
          productImage(c.keyword, lock + 1000),
          productImage(c.keyword, lock + 2000),
        ],
        freeShipping: globalIdx % 3 !== 0,
        almostGone: globalIdx % 5 === 0,
        description: `${name} — imported directly through Fotizo's global sourcing network. Quality-checked before dispatch, with fast tracked shipping and buyer protection on every order.`,
      };
    }),
);

export function discountPct(p: Pick<ShopProduct, "price" | "originalPrice">): number {
  if (p.originalPrice <= p.price) return 0;
  return Math.round((1 - p.price / p.originalPrice) * 100);
}

export function getShopProduct(id: string): ShopProduct | undefined {
  return SHOP_PRODUCTS.find((p) => p.id === id);
}

export function shopProductsByCategory(categoryId: string | null): ShopProduct[] {
  if (!categoryId) return SHOP_PRODUCTS;
  return SHOP_PRODUCTS.filter((p) => p.category === categoryId);
}

// Most-discounted items, for the "Lightning Deals" strip.
export function flashDeals(limit = 10): ShopProduct[] {
  return [...SHOP_PRODUCTS].sort((a, b) => discountPct(b) - discountPct(a)).slice(0, limit);
}

export function relatedShopProducts(product: ShopProduct, limit = 6): ShopProduct[] {
  return SHOP_PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id,
  ).slice(0, limit);
}

export function categoryLabel(id: string): string {
  return CATALOG[id]?.label ?? id;
}

// Formats a sold count Temu-style: 9500 → "9.5k+ sold".
export function soldLabel(sold: number): string {
  if (sold >= 1000) return `${(sold / 1000).toFixed(1).replace(/\.0$/, "")}k+ sold`;
  return `${sold} sold`;
}
