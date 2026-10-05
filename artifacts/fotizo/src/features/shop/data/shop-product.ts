// The shop product shape and the small helpers cards and pages need. Kept apart
// from ./products, which bundles the multi-megabyte preview catalogue and is only
// loaded on demand (see ./local-catalogue).

export interface ShopProduct {
  variants?: {
    id: string;
    colour: string;
    size: string;
    image: string;
    price: number;
  }[];
  sizeGuide?: { size: string; suggestedWeightKg: string }[];
  specifications?: { label: string; value: string }[];
  detailImages?: string[];
  video?: string;
  requiresPublication?: boolean;
  sourcing?: {
    platform: string;
    productId: string;
    originalTitle: string;
    sourcePage: string;
    capturedAt: string;
    currency: string;
    priceRange: string;
    minimumOrder: string | null;
    unit: string | null;
    originalImage: string;
    priceStatus: string;
    usdPerGbp?: number;
    sourceToGbp?: number;
    exchangeRateDate?: string;
    exchangeRateSource?: string;
    previewMarkup: number;
  };
  stockCount?: number;
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
  /**
   * Supplier listing this was imported from, for buyers/ops to trace a product
   * back to its source. Absent on the older hand-entered listings.
   */
  sourceUrl?: string;
}

export function discountPct(
  p: Pick<ShopProduct, "price" | "originalPrice">,
): number {
  if (p.originalPrice <= p.price) return 0;
  return Math.round((1 - p.price / p.originalPrice) * 100);
}

// Formats a sold count Temu-style: 9500 → "9.5k+ sold".
export function soldLabel(sold: number): string {
  if (sold >= 1000)
    return `${(sold / 1000).toFixed(1).replace(/\.0$/, "")}k+ sold`;
  return `${sold} sold`;
}
