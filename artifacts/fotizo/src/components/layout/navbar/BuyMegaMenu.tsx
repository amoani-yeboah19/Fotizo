import { Store, CarFront } from "lucide-react";
import { NavMegaMenu, type MegaMenuItem } from "@/components/layout/navbar/NavMegaMenu";

// The "buy things" side of the header. The local seller Marketplace (/products)
// is deliberately absent: its catalog is still empty, so linking to it sends
// customers to a page showing zero results. Add it back once sellers have
// listed stock.
const ITEMS: MegaMenuItem[] = [
  {
    label: "Fotizo Shop",
    href: "/shop",
    description: "Everyday goods sourced from our China supplier network, delivered in 7–21 days.",
    icon: Store,
    accent: true,
  },
  {
    label: "Fotizo Autos",
    href: "/autos",
    description: "Changan, Jetour and Avatr vehicles imported to order, duty and papers handled.",
    icon: CarFront,
  },
];

export function BuyMegaMenu() {
  return <NavMegaMenu label="Shop" href="/shop" items={ITEMS} />;
}
