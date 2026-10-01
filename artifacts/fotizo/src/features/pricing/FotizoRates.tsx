import rates from "./rates.json";

const fees = (amounts: typeof rates.seller.amounts) =>
  `GH₵${amounts.GHS}, $${amounts.USD}, £${amounts.GBP} or €${amounts.EUR}`;

export function FotizoRates() {
  return (
    <section aria-label="Fotizo rates" className="mb-6 rounded-xl border border-border bg-muted/30 p-4 text-sm">
      <h2 className="font-semibold text-foreground">Fotizo rates</h2>
      <ul className="mt-2 space-y-1 text-muted-foreground">
        <li>Artisans and service providers: {fees(rates.artisan.amounts)} once per new paying customer. Repeat bookings with that customer do not attract this fee again.</li>
        <li>Sellers and shops: {fees(rates.seller.amounts)} per product unit sold.</li>
        <li>Goods sourced from Alibaba, Taobao and Pinduoduo: {rates.chineseGoods.markupPercent}% markup on the supplier price.</li>
      </ul>
      <p className="mt-2 text-muted-foreground">The flat fee uses the transaction currency. Fee collection is not yet active.</p>
    </section>
  );
}
