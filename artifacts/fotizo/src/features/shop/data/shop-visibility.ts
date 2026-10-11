import excludedOffers from "./excluded-shop-offers.json";
import type { ShopProduct } from "./shop-product";

const excluded = new Set(excludedOffers);

// These imported sticker listings include the flags and Chinese driving decals
// previously promoted as the cheapest finds. Keep them out of every shop feed.
export function isShopVisible(
  product: Pick<ShopProduct, "title" | "id" | "sourcing">,
): boolean {
  const offer =
    product.sourcing?.platform === "1688"
      ? product.sourcing.productId
      : product.id.replace(/^(preview-)?1688-/, "");
  return (
    !excluded.has(offer) &&
    !/^(decorative vehicle trim or sticker|vehicle decorative stickers)$/i.test(
      product.title.trim(),
    ) &&
    !/\b(china|chinese)\s+(flag|national flag|team)\b|中国|国旗|红旗/i.test(
      product.title,
    )
  );
}
