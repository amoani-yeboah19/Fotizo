import { Laptop, Hammer, Building2, type LucideIcon } from "lucide-react";
import { SERVICE_GROUPS } from "@workspace/service-taxonomy";
import { NavMegaMenu, type MegaMenuItem } from "@/components/layout/navbar/NavMegaMenu";

// The taxonomy package stays dependency-free, so it names its icons as strings
// rather than importing lucide. Resolve them here, where lucide is already a
// dependency. Any group whose icon isn't mapped falls back to the hammer.
const ICONS: Record<string, LucideIcon> = { Laptop, Hammer, Building2 };

// Built from SERVICE_GROUPS rather than hardcoded, so adding a provider group
// to the taxonomy puts it in the header automatically.
const ITEMS: MegaMenuItem[] = SERVICE_GROUPS.map((group) => ({
  label: group.label,
  href: `/services?group=${group.id}`,
  description: group.description,
  icon: ICONS[group.icon] ?? Hammer,
}));

export function HireMegaMenu() {
  return (
    <NavMegaMenu
      label="Services"
      href="/services"
      items={ITEMS}
      footer={{
        text: "Offer your own service on Fotizo",
        linkText: "Get listed",
        href: "/dashboard/seller/services/new",
      }}
    />
  );
}
