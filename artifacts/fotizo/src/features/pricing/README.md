# Fotizo rates — frontend and backend handoff

`rates.json` is the approved rate schedule. The seller dashboard displays it; the Alibaba import tools use its Chinese-goods markup. This change does not debit accounts, charge cards, deduct seller payouts or write fees to a database.

- Artisans/service providers: charge GH₵1, US$1, £1 or €1 per paid booking through Fotizo, including every repeat booking by the same customer. Deduplicate by booking ID across devices, payment retries and webhook deliveries so each booking is charged once. A new booking creates a new fee even when the provider and customer are unchanged. Apply only after confirmed payment, never on a lead or profile view.
- Sellers/shops: charge one unit of the transaction currency per product unit sold. For quantity three, the fee is GH₵3 / US$3 / £3 / €3. The seller bears the fee; do not add it as a buyer surcharge. Settlement and refund/reversal timing still need to be agreed before enabling collection.
- Chinese-source goods: supplier cost × 1.30. Applies to Alibaba, Taobao and Pinduoduo. This is 30% markup, not a 30% profit margin and not an extra 30% on top of a previously marked-up price. Freight, duties and final delivery costs are not established by this rule.

Flat fees are nominal amounts in the transaction's recorded currency, not GBP amounts converted through the buyer's display-currency switcher. EUR is included in the fee schedule; adding EUR to payments/display exchange rates requires separate currency support. Unsupported transaction currencies must not silently fall back to another currency.

Backend implementation needs authoritative transaction currencies, booking identity and provider/customer identity, atomic and idempotent ledger entries, quantity-aware seller fees and payout/refund accounting. Do not infer collection from a frontend button, status badge or client-supplied price. Whether Fotizo's own sourced shop should also incur the seller fee is unresolved; the frontend adds only the 30% markup to imported product prices.

The catalogue retains its existing fixed import USD/GBP conversion (1.27 USD per GBP) as an estimate. JSON-sourced listings are recalculated from stored supplier quotes; older inline Alibaba entries lack raw quotes and use the approximate base recovered from the old 2.2 multiplier. No stock quantities are added.
