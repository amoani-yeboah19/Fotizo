# 1688 home, personal care and electronics batch

**4,171 products added to the local frontend catalogue; 50 records held.**
Holds: 6 invalid/zero prices, 36 unrelated treatment/medical listings, 7 unclear
English product identities and 1 unavailable image. The existing 3,240 sourced
products are preserved, giving 7,411 sourced listings in total.

Sourced from all seven category links supplied by the owner. See `manifest.json`
for final counts, storefront inclusions, held records, category coverage and checksums.

All **50 public page numbers per category** were checked. Network timeouts and
unexpected responses occurred during collection; failed pages were resumed once
ordinary public requests worked again. `coverage.json` records the final page
attempts and returned offer IDs, not every earlier network retry. The public
promotional search window is not an exhaustive supplier inventory. Offers rotate
and overlap; no claim of capturing all products on 1688 is made.

| Supplied category | Unique offers in that category |
| --- | ---: |
| Pets & gardening | 502 |
| Daily essentials | 569 |
| Hair styling | 527 |
| Household cleaning | 548 |
| Digital/computers | 529 |
| Car accessories | 540 |
| Home appliances | 1,006 |

There are **4,221 unique offers** after deduplicating cross-category identities.
All captured offers remain in the private handoff, including held records.

## Frontend

Eligible records join the normal shop grid and existing product-detail layout.
They use locally saved, decoded WebP photos and concise English merchandising
copy derived from explicit source-title words. These are not complete translations
of supplier descriptions or verified technical specifications. Listed screen sizes,
capacities and material/features are labelled accordingly. No invented variants,
stock quantities, reviews, sales figures, shipping promises or gallery images.

Supplier links and CNY costs stay in the private handoff; the public JSON contains
neither. Prices use supplier CNY cost × 1.30 / the timestamped CNY-per-GBP rate,
rounded half-up to two decimals. The existing currency selector displays them in
the shopper's selected currency. Prices remain estimates; delivery is separate.

The source's photos may contain Chinese writing, as accepted by the owner. Every
included image is decoded/validated; a sample was visually checked, not every
image. Many are search thumbnails rather than a full-resolution product gallery.

Records without an identifiable English product type, a usable image or valid
price are held. Unrelated medicinal/personal-treatment results in household search
remain for merchandising review. Existing catalogue identities are not duplicated.
`held-products.json` lists the precise reasons; no fake replacements are inserted.

These are frontend sourcing listings with `requiresPublication: true`. They can be
browsed but cannot be purchased until the backend team publishes real product IDs
and confirms order details. No database changes were made. Local code must be
deployed before the hosted shop changes.

## Backend handoff

- Import `products.json` into staging, upserting by `(platform: 1688, productId)`.
  Keep `publishable: false` until reviewed. Never overwrite reviewed data or orders.
- Use `review.csv` for merchandising review; JSON is the canonical machine format.
  CSV supplier text is escaped against spreadsheet formulas.
- Confirm category, English copy, model/compatibility, actual per-unit price,
  minimum order, dimensions, electrical voltage/plug and included accessories.
  Search prices can be entry prices for different models. Unknown is not zero.
- Obtain each listing's real colours, sizes, model SKUs and variant-specific prices
  before enabling selectors/checkout. Do not reuse another product's options.
- Keep source URLs private. Add `1688` to source-platform validation separately
  from retired Alibaba.com products. Apply the 30% markup only once.
- Move approved images into managed storage, publish stable backend IDs, and
  remove migrated frontend snapshot records so backend products take precedence.
- Persist selected SKU identity in cart/order lines before variant checkout opens.

## Reproduction

`scripts/sourcing/capture_1688_home.py` saves resumable public search checkpoints
under `/tmp/fotizo-1688-home-2026-10-05`. It does not use login credentials or bypass
CAPTCHA. `prepare_1688_home.py` builds the sanitized handoff and English drafts;
`download_1688_home.py` saves genuine source images; `export_1688_home.py` validates
images and prices and writes the frontend snapshot, CSV and manifest. The image
and export scripts require Pillow. The exporter reads the GBP rate response from
`/tmp/fotizo-home-rates.json`; preserve a timestamped snapshot when regenerating.
Run preparation before exporting, then regenerate the manifest after any edits.
