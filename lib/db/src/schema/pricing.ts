import type { FeeCurrency } from "./fees";

// Fotizo's rate schedule — the server's authoritative copy of
// artifacts/fotizo/src/features/pricing/rates.json (a test keeps them equal).
// Flat fees are fixed amounts in the transaction's own currency, not
// conversions of £1.
export const FEE_SCHEDULE = {
  /** Per paid booking, including every repeat booking by the same customer. */
  artisan: { GHS: 1, USD: 1, GBP: 1, EUR: 1 } as Record<FeeCurrency, number>,
  /** Per product unit sold; the seller bears it, buyers never see it. */
  seller: { GHS: 1, USD: 1, GBP: 1, EUR: 1 } as Record<FeeCurrency, number>,
};

/** Supplier cost x 1.30 for goods sourced from these platforms. */
export const CHINESE_GOODS = {
  platforms: ["alibaba", "1688", "taobao", "pinduoduo"] as const,
  markupPercent: 30,
};
export type ChinesePlatform = (typeof CHINESE_GOODS.platforms)[number];

export const isFeeCurrency = (currency: string): currency is FeeCurrency => currency in FEE_SCHEDULE.seller;

/**
 * Selling price in GBP for imported goods: the supplier cost marked up by
 * 30% (a markup on cost, not a margin), converted at `ratePerGbp` supplier-
 * currency units per GBP. Rounded to the penny. Shipping is priced separately.
 *
 * Example: a GH₵100 cost at 15 GHS/GBP sells for GH₵130, i.e. £8.67.
 */
export function sourcedPriceGbp(supplierCost: number, ratePerGbp: number, markupPercent = CHINESE_GOODS.markupPercent) {
  if (!(supplierCost > 0) || !(ratePerGbp > 0)) throw new Error("Supplier cost and exchange rate must be positive.");
  return Math.round(((supplierCost * (100 + markupPercent)) / 100 / ratePerGbp) * 100) / 100;
}
