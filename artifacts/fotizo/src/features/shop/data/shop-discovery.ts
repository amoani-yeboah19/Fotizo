import type { ShopProduct } from "./shop-product";

export {
  SHOP_COLLECTIONS,
  matchesCollection,
  productCollections,
  type ShopCollection,
} from "@workspace/shop-taxonomy";
import { productCollections } from "@workspace/shop-taxonomy";

export type ViewedProduct = {
  id: string;
  category: string;
  collections: string[];
  at: number;
};
function hash(id: string) {
  let n = 0;
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) | 0;
  return n >>> 0;
}
export function discoveryPicks(
  products: ShopProduct[],
  history: ViewedProduct[],
  limit = 12,
) {
  const seen = new Set(history.map((h) => h.id));
  const weights = new Map<string, number>();
  history.forEach((h, i) => {
    const weight = Math.max(1, 12 - i);
    weights.set(h.category, (weights.get(h.category) ?? 0) + weight);
    h.collections.forEach((c) =>
      weights.set(
        `${h.category}/${c}`,
        (weights.get(`${h.category}/${c}`) ?? 0) + weight,
      ),
    );
  });
  const preferred = [
    "womens",
    "shoes-bags",
    "appliances",
    "mens",
    "baby",
    "furniture",
    "beauty",
    "wigs",
  ];
  const ranked = products
    .filter((p) => p.price > 0 && p.image && !seen.has(p.id))
    .map((p) => ({
      p,
      score:
        (!history.length && preferred.includes(p.category)
          ? preferred.length - preferred.indexOf(p.category)
          : 0) +
        (weights.get(p.category) ?? 0) +
        productCollections(p).reduce(
          (n, c) => n + (weights.get(`${p.category}/${c}`) ?? 0) * 2,
          0,
        ),
    }))
    .sort((a, b) => b.score - a.score || hash(a.p.id) - hash(b.p.id));
  const result: ShopProduct[] = [],
    counts = new Map<string, number>();
  // Keep discovery varied rather than filling every slot with one department.
  for (const { p } of ranked) {
    if (
      (counts.get(p.category) ?? 0) >=
      Math.max(1, Math.ceil(limit / (history.length ? 3 : 6)))
    )
      continue;
    result.push(p);
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    if (result.length === limit) return result;
  }
  for (const { p } of ranked) {
    if (!result.some((r) => r.id === p.id)) result.push(p);
    if (result.length === limit) break;
  }
  return result;
}
