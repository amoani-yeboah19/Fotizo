// Shop department metadata — the category list and its label lookup, split out
// from the product catalogue next door.
//
// products.ts carries every listing inline (hundreds of them, with image URLs
// and descriptions), so importing anything from it pulls the whole array into
// the chunk. The Footer only needs a category's display name, and the Footer is
// in PageLayout, which is on every page — so keeping these here is what stops
// Terms, Privacy, Guides and the rest from downloading the entire catalogue.
//
// Anything that needs per-department product counts or cover art belongs in
// products.ts instead: that genuinely needs the listings.

import type { LucideIcon } from "lucide-react";
import {
  ShoppingBag,
  Package,
  Shirt,
  Dumbbell,
  Sparkles,
  Venus,
  Watch,
  Smartphone,
  Zap,
  BedDouble,
  Globe,
  Tv,
  PersonStanding,
  Baby,
  Hammer,
  Laptop,
  Car,
  Snowflake,
  PawPrint,
  Scissors,
  Activity,
} from "lucide-react";

export interface ShopCategory {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: "shoes-bags", label: "Shoes & Bags", icon: ShoppingBag },
  { id: "general", label: "General Merchandise", icon: Package },
  { id: "wigs", label: "Wigs & Hair", icon: Scissors },
  { id: "jackets", label: "Winter Jackets", icon: Snowflake },
  { id: "pets", label: "Pet Supplies", icon: PawPrint },
  { id: "mens", label: "Men's Clothing", icon: Shirt },
  { id: "sports", label: "Sports Furniture", icon: Dumbbell },
  { id: "gymwear", label: "Gym Wear", icon: Activity },
  { id: "beauty", label: "Beauty", icon: Sparkles },
  { id: "womens", label: "Women's Clothing", icon: Venus },
  { id: "accessories", label: "Accessories", icon: Watch },
  { id: "phones", label: "Phones", icon: Smartphone },
  { id: "appliances", label: "Home Appliances", icon: Zap },
  { id: "textiles", label: "Home Textiles", icon: BedDouble },
  { id: "global", label: "Global", icon: Globe },
  { id: "entertainment", label: "Entertainment", icon: Tv },
  { id: "underwear", label: "Underwear", icon: PersonStanding },
  { id: "baby", label: "Mum & Baby", icon: Baby },
  { id: "improvement", label: "Home Improvement", icon: Hammer },
  { id: "computers", label: "Computers", icon: Laptop },
  { id: "car", label: "Car Accessories", icon: Car },
];

export function categoryLabel(id: string): string {
  return SHOP_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
