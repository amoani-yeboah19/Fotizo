import excludedOffers from "./excluded-shop-offers.json";
import culturalOffers from "./excluded-cultural-shop-offers.json";
import type { ShopProduct } from "./shop-product";

const excluded = new Set([...excludedOffers, ...Object.keys(culturalOffers)]);

// Match the subject of a listing, never its country of manufacture or the
// language of supplier advertising. English display titles often omit symbols
// visible in the photos, so the reviewed offer IDs above are authoritative.
const excludedSubject =
  /\b(?:china|chinese)\s+(?:national\s+)?(?:flag|team)|\b(?:mao\s*(?:zedong|tse[- ]?tung)|chairman mao|chinese communist party|guanyin|guan yin|pixiu|pi xiu|feng shui|chinese (?:dragon|knot|opera|lucky charm))\b|五星红旗|国旗|党旗|党徽|毛主席|毛泽东|天安门|观音|貔貅|财神|中国结|京剧|祥龙|龙摆件|招财进宝|天官赐福|福字/i;

// Keep removed offers (including sticker listings and the red long-sleeve
// women's blouse) out of every shop feed, including published server results.
export function isShopVisible(
  product: Pick<ShopProduct, "title" | "id" | "sourcing"> &
    Partial<
      Pick<ShopProduct, "image" | "images" | "detailImages" | "variants">
    >,
): boolean {
  const offer =
    product.sourcing?.platform === "1688"
      ? product.sourcing.productId
      : product.id.replace(/^(preview-)?1688-/, "");
  return (
    !excluded.has(offer) &&
    // Published rows may have a UUID and omit supplier terms. Their local
    // image path still identifies the reviewed offer, including gallery media.
    ![
      product.image,
      ...(product.images ?? []),
      ...(product.detailImages ?? []),
      ...(product.variants ?? []).map((v) => v.image),
    ].some((path) => {
      const match = path?.match(/\/images\/1688[^/]*\/(\d+)(?:[/.\-_]|$)/);
      return match ? excluded.has(match[1]) : false;
    }) &&
    !/^(decorative vehicle trim or sticker|vehicle decorative stickers)$/i.test(
      product.title.trim(),
    ) &&
    !excludedSubject.test(product.title) &&
    !excludedSubject.test(product.sourcing?.originalTitle ?? "")
  );
}
