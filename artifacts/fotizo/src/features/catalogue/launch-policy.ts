import retired from "./retired-listings.json";

// Exact launch retirements; do not hide new uploads by the same sellers.
export const retiredProduct = (id: string) => retired.products.includes(id);
export const retiredService = (id: string) => retired.services.includes(id);
export const retiredVehicle = (id: string) => (retired.vehicles as string[]).includes(id);
// Alibaba listings are no longer hidden here: which ones show is decided by
// publication in the database (unpublished and held listings are never served).
export function visibleProduct<T extends { id: string }>(p: T) {
  return !retiredProduct(p.id);
}
