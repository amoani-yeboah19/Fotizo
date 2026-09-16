import { Store, CarFront, StoreIcon } from "lucide-react";
import { NavMegaMenu, type MegaMenuItem } from "@/components/layout/navbar/NavMegaMenu";
import { DELIVERY_WINDOWS } from "@/features/support/data/channels";

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
  {
    label: "Fotizo Marketplace",
    href: "https://fotizo.vercel.app/products",
    description: "Browse local seller listings and community marketplace products in one place.",
    icon: StoreIcon,
  },
];

export function BuyMegaMenu() {
  return <NavMegaMenu label="Shop" href="/shop" items={ITEMS} showMenu={false} />;
}
