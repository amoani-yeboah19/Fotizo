import { Store, CarFront, Users } from "lucide-react";
import { NavMegaMenu, type MegaMenuItem } from "@/components/layout/navbar/NavMegaMenu";

// The "buy things" side of the header: imported stock, vehicles, and the local
// seller marketplace — three distinct supply lines, kept separate so a shopper
// always knows who they're buying from.
const ITEMS: MegaMenuItem[] = [
  {
    label: "Fotizo Shop",
    href: "/shop",
    description: "Everyday goods sourced from our China supplier network, delivered in 7–21 days.",
    icon: Store,
  },
  {
    label: "Fotizo Autos",
    href: "/autos",
    description: "Changan, Jetour and Avatr vehicles imported to order, duty and papers handled.",
    icon: CarFront,
  },
  {
    label: "Local Marketplace",
    href: "/products",
    description: "Buy directly from sellers here on Fotizo — no imports, no middleman.",
    icon: Users,
  },
];

export function BuyMegaMenu() {
  return <NavMegaMenu label="Shop" href="/shop" items={ITEMS} />;
}
