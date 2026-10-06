import type { ShopProduct } from "./shop-product";

/** Fotizo sizing preferences, never supplier SKUs or a claim of available stock. */
export function clothingSizeRequest(product: ShopProduct) {
  if (product.variants?.length) return null;
  if (
    !["mens", "womens", "gymwear", "underwear", "jackets"].includes(
      product.category,
    )
  )
    return null;
  if (
    /\b(shoes?|boots?|sandals?|bags?|belts?|hats?|caps?|scarves|scarfs?|socks?|jewellery|jewelry|dogs?|cats?|pets?)\b/i.test(
      product.title,
    )
  )
    return null;

  const waist = /\b(jeans|trousers|chinos|pants)\b/i.test(product.title);
  const sizes = waist
    ? (product.category === "womens"
        ? [24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 36, 38, 40]
        : [28, 29, 30, 31, 32, 33, 34, 36, 38, 40, 42, 44]
      ).map((value) => `W${value}`)
    : ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

  return {
    sizes,
    label: waist ? "Waist size (inches)" : "Clothing size",
    guidance: waist
      ? "W32 means a requested 32-inch waist (about 81 cm). Measure around your waist where you wear your trousers. Leg length and garment fit must be confirmed separately."
      : "Choose the clothing size you usually wear. Size labels vary by brand; compare your chest, waist and hip measurements with the product’s size chart when it becomes available.",
  };
}
