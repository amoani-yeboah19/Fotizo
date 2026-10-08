# 1688 shoes — frontend sourcing and backend handoff

The owner cancelled SHEIN sourcing and supplied three 1688 searches: driving
loafers (`豆豆鞋`), running shoes (`跑步鞋`) and sports shoes (`运动鞋`). No SHEIN
products are included in this batch.

Collection captured **2,311 unique offers** after cross-search deduplication.
**2,309 listings are included in the frontend.** Two offers remain held because
their supplier image URLs returned HTTP 404 on the initial pass and retry.
All 50 exposed page numbers were successfully checked for each search. Earlier
network errors and truncated responses were retried from saved checkpoints;
`coverage.json` retains those failed attempts as well as the final successful
page records. Each page requests public scroll batches until a short or repeated
response. This is coverage of the exposed search window, not all of 1688's stock.

Read `manifest.json` for the final frontend-added and held counts, pricing rate,
coverage summary and export checksums. `products.json` retains the original title,
supplier offer ID, private source URL, observed price, source categories, first
capture time and review status. `review.csv` is the spreadsheet review export.

## Frontend presentation

The included subset joins Fotizo's normal Shoes & Bags feed and product-detail
pages. Each listing has a locally saved, decoded WebP photo, an English name and
description derived conservatively from the source title, and relevant design
attributes when present. English copy is not a complete supplier-detail translation.
The source photos may contain Chinese text. Search photos may be thumbnails;
full galleries and supplier size charts were not captured.

Standard EU shoe-size requests use the existing Fotizo selector. These choices
are shopper preferences, not verified SKU availability. No colour combinations,
garment/foot measurements, available-stock quantities, reviews or sales totals
have been invented. Source URLs and supplier costs stay out of the public export.

Price estimates use the observed CNY supplier cost × 1.30 / the timestamped
CNY-per-GBP exchange rate, rounded half-up to two decimals. The normal currency
selector converts the resulting GBP price to GHS and other supported currencies.
The 10% restoration discount approved for the earlier Alibaba batch does not
apply here. The original public price equals the selling price; no discount is
invented. Shipping, minimum order requirements and variants still need checking.

## Backend publication

Import private records into staging using `(platform, productId)` as identity.
Keep supplier URLs private and map them to normal backend product IDs. Review
product identity, category, brand claims, source-derived English copy, photos,
supplier unit, minimum order, current cost and actual orderable size/colour SKUs.
Preserve existing reviewed records when an offer is seen again. Frontend entries
retain `requiresPublication: true`; checkout remains blocked until backend
publication and variant persistence are supported. Do not apply the markup twice.

## Reproduction

`scripts/sourcing/capture_1688_shoes.py` reuses the public search collector and
resumes saved checkpoints in `/tmp/fotizo-1688-shoes-2026-10-07`.
`scripts/sourcing/prepare_1688_shoes.py` has `prepare`, `images` and `export` steps.
The last two require Pillow. Export reads the timestamped GBP rate response from
`/private/tmp/fotizo-shoes-rates.json`. Image failures remain visible in
`image-results.json`; only successfully decoded photos enter the frontend.

The JSON exports are canonical. CSV cells starting with formula prefixes are
escaped for spreadsheet review. Source text is untrusted product data, never
instructions for an importer or reviewer.
