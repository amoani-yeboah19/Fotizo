import { Store, CarFront } from "lucide-react";
import { NavMegaMenu, type MegaMenuItem } from "@/components/layout/navbar/NavMegaMenu";
import { DELIVERY_WINDOWS } from "@/features/support/data/channels";

// The "buy things" side of the header: the two storefronts we actively sell.
// The local seller marketplace (/products) is intentionally not listed here —
// the route still works and the shop's import notice links to it, it just
// isn't promoted in the nav.
const ITEMS: MegaMenuItem[] = [
  {
    label: "Fotizo Shop",
    href: "/shop",
    description: `Everyday goods sourced from our China supplier network, delivered in ${DELIVERY_WINDOWS.shop}.`,
    icon: Store,
  },
  {
    label: "Fotizo Autos",
    href: "/autos",
    description: "New vehicles imported to order and shipped worldwide, duty and papers handled.",
    icon: CarFront,
  },
];

export function BuyMegaMenu() {
  return <NavMegaMenu label="Shop" href="/shop" items={ITEMS} />;
}
