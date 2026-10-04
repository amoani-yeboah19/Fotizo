import type { ShopProduct } from "./shop-product";

export async function loadPreviewCatalogue(): Promise<ShopProduct[]> {
  const { default: rows } = await import("./1688-preview.json");
  return rows.map((row) => ({
    ...row,
    previewOnly: true,
    price: 0,
    originalPrice: 0,
    images: [row.image],
    rating: 0,
    sold: 0,
    freeShipping: false,
    almostGone: false,
    description: `English translation pending. Original product title: ${row.originalTitle}`,
  }));
}
