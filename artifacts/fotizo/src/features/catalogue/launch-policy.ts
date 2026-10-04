import retired from "./retired-listings.json";

// Exact launch retirements; do not hide new uploads by the same sellers.
export const retiredProduct = (id: string) => retired.products.includes(id);
export const retiredService = (id: string) => retired.services.includes(id);
export const retiredVehicle = (id: string) => retired.vehicles.includes(id);
export function isAlibabaCom(url?: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "alibaba.com" || host.endsWith(".alibaba.com");
  } catch {
    return false;
  }
}
export function visibleProduct(p: {
  id: string;
  sourceUrl?: string;
  tags?: string[];
  specs?: Record<string, string>;
  sourcing?: { platform?: string };
}) {
  return (
    !retiredProduct(p.id) &&
    !p.id.startsWith("ali-") &&
    !p.id.startsWith("alibaba-") &&
    p.sourcing?.platform !== "alibaba" &&
    !p.tags?.some((tag) => tag.toLowerCase() === "alibaba") &&
    !isAlibabaCom(p.sourceUrl ?? p.specs?.supplierListing)
  );
}
