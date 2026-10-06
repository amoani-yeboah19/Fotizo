import type { ShopProduct } from "./shop-product";
import { clothingSizeRequest } from "./clothing-sizes";

/** Standard requests only; confirmed supplier variants always take priority. */
export function productSizeRequest(product: ShopProduct) {
  if (product.variants?.length) return null;
  const footwear =
    /\b(shoes?|boots?|sneakers?|trainers?|sandals?|slippers?|loafers?|heels|footwear|flip[ -]?flops?|espadrilles?|moccasins?)\b/i.test(
      product.title,
    );
  if (!footwear) return clothingSizeRequest(product);
  if (
    ![
      "shoes-bags",
      "mens",
      "womens",
      "gymwear",
      "baby",
      "general",
      "accessories",
    ].includes(product.category)
  )
    return null;
  // The combined department includes many shoe storage bags and shoe-care items.
  if (
    /\b(bags?|storage|racks?|boxes|box|organisers?|organizers?|cleaners?|cleaning|polish|insoles?|laces?|covers?|shoehorns?|socks?|charms?)\b/i.test(
      product.title,
    )
  )
    return null;
  const kids =
    /\b(kids?|children|child|baby|babies|toddlers?|infants?|junior|boys?|girls?)\b/i.test(
      product.title,
    );
  const firstSize = kids ? 16 : 35;
  const lastSize = kids ? 35 : 48;
  return {
    sizes: Array.from(
      { length: lastSize - firstSize + 1 },
      (_, index) => `EU ${firstSize + index}`,
    ),
    label: kids ? "Children’s shoe size (EU)" : "Shoe size (EU)",
    guidance:
      "Choose your usual European (EU) shoe size. Measure both feet from heel to longest toe and use the longer foot when checking the supplier’s size chart. Fit and width vary by style; these choices are size requests, not a verified size chart.",
  };
}
