/** The API stores GBP; the service editor accepts USD. Rates are USD per GBP. */
export function validUsdRate(rate: unknown): rate is number {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
}
export function servicePrice(
  amount: number,
  rate: number,
  direction: "to-usd" | "to-base",
): number {
  if (!validUsdRate(rate) || !Number.isFinite(amount))
    throw new Error("Pricing conversion is unavailable.");
  return (
    Math.round((direction === "to-usd" ? amount * rate : amount / rate) * 100) /
    100
  );
}
