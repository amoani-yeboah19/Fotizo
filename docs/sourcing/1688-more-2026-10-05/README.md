# 1688 packaging, office, lighting and electronics batch

**3,148 products added to the local frontend catalogue** from **3,216 unique
captured offers**. The previous 7,411 sourced listings remain, for **10,559**
sourced listings in the combined local catalogue. Another 68 records are held:
17 invalid or zero prices, 33 unclear English product identities, 14 service or
assortment offers, and 4 unavailable images. See `manifest.json` for the exact
counts, category memberships and file checksums.

The owner also supplied the same car accessories link as in the preceding batch.
Its 540 captured offers (539 then included on the frontend) are already in
`docs/sourcing/1688-home-2026-10-05`; they were reused, not imported twice.

| New source search | Unique offers in that search | Successful pages | Coverage |
| --- | ---: | ---: | --- |
| Packaging | 657 | 50/50 | Exposed page window checked |
| Office and education | 635 | 50/50 | Exposed page window checked |
| Logistics packaging and materials | 145 | 8 attempts | Search returned an ordinary empty response on page 8 |
| Lighting | 669 | 50/50 | Exposed page window checked |
| Lighting market | 611 | 26/27 attempts | CAPTCHA at page 27 |
| Electronics market | 518 | 20/21 attempts | CAPTCHA at page 21 |
| Furniture and lighting | 380 | 11/12 attempts | CAPTCHA during page 12 |

The last three searches **are partial**. A normal retry still returned 1688's
CAPTCHA response; no bypass was attempted. `coverage.json` contains attempted
pages, response status and offer IDs. `products.json` retains every captured
listing, including held records. These public promotional search windows do not
represent 1688's complete inventory. Offers rotate and overlap across searches.

## Frontend and review

Included products use Fotizo's normal shop grid and detail pages. New Packaging,
Lighting and Electronics departments were added; other items use existing Office,
Home Improvement, Accessories, General Merchandise and Smart Devices categories.
Each included record has a locally saved, decoded WebP photo, an English product
name and concise description derived from the search title, and an estimated GBP
price. These drafts are not complete supplier descriptions or verified product
specifications. A photo sample was visually checked, not every image. Some
photos contain Chinese writing, which the owner accepted.

Price = supplier CNY cost × 1.30 / the timestamped CNY-per-GBP rate in
`1688-more-pricing.json`, rounded half-up to two decimals. The site's currency
selector converts from GBP. Source prices may be entry prices for variants,
and delivery is additional. Source URLs, CNY costs and search metadata remain
in this private handoff, not the customer product JSON. No stock quantities,
ratings, sales counts, verified colour/size options or extra gallery photos were
invented.

Products have `requiresPublication: true`; browsing is enabled but checkout is
blocked until the backend publishes reviewed products and preserves SKU identity.
No database records were changed. Changes must be deployed before the hosted
site updates.

## Backend handoff

Import `products.json` to staging and upsert by `(platform: 1688, productId)`.
`review.csv` is for merchandising review and neutralises spreadsheet formulas
in supplier-controlled text. `held-products.json` lists why a record did not
enter the frontend. Review English copy, classification, manufacturer claims,
model/part codes, size and compatibility, physical specifications, electrical
voltage/plug, unit and minimum order, variant pricing, images and availability.
Keep source URLs private. Add `1688` to backend source-platform validation and
apply the 30% markup only once; it is distinct from retired Alibaba.com offers.
Do not publish a source product until its actual SKU options and order-line
identity can be stored. Remove frontend snapshot rows as matching backend IDs
are published, without overwriting reviewed fields or existing orders.

## Reproduction

`scripts/sourcing/capture_1688_more.py` saves resumable page checkpoints in
`/tmp/fotizo-1688-more-2026-10-05`. It uses public results, with no login,
cookies or CAPTCHA bypass. `prepare_1688_more.py` builds the handoff and source-
derived English drafts. `download_1688_more.py` fetches and decodes real images;
`export_1688_more.py` validates prices and images and creates the frontend JSON,
CSV and manifest. Image/export scripts require Pillow. The exporter uses the
rate response at `/tmp/fotizo-more-rates.json`; capture a timestamped rate when
regenerating. Run preparation before exporting and regenerate the manifest after
any source or translation edits.
