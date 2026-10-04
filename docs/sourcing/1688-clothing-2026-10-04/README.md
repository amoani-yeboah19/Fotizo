# 1688 clothing sourcing — backend handoff

This batch contains **unpublished sourcing drafts**, not checkout-ready products.
The owner requested files for the backend team; no database records or live shop
listings were created. Read `manifest.json` for final counts and capture coverage.

The owner's subsequent request connects all 3,242 offers to a **New collection
preview** section on `/shop`, independently of backend availability. Preview
cards have category/search filters and detail pages, show CNY markup estimates,
and cannot be added to the cart or purchased. English translations and verified
colour options remain pending. The frontend snapshot excludes supplier links;
the private handoff below retains them for operations. This change must be
deployed before it appears on the hosted website.

**Captured: 3,242 unique offers**, after removing two cross-category duplicates.
All 50 exposed page numbers were checked for each category, with no recorded
request errors. This is coverage of the public search window, not the full
1688 inventory. All 3,242 records still require English translation and review.

| Fotizo category | Offers before cross-category deduplication | Pages checked |
| --- | ---: | ---: |
| Men's Clothing | 645 | 50 |
| Women's Clothing | 654 | 50 |
| Underwear | 662 | 50 |
| Gym Wear | 661 | 50 |
| Shoes & Bags | 622 | 50 |

Validation passed for unique identities, contiguous page coverage, positive
supplier prices, decimal markup calculations, CSV row counts and file checksums.
Every record contains a source title and HTTPS image URL; image content and
availability have not been verified. Exporter edge checks also passed for
cross-category deduplication, invalid-price holds and CSV formula escaping.

## Files

- `products.json`: one record per 1688 offer ID, deduplicated across categories.
- `review.csv`: spreadsheet for English translation and merchandising review.
- `coverage.json`: attempted pages, scroll batches, returned IDs and errors.
- `manifest.json`: counts, limitations and SHA-256 checksums of the exports.

Categories match Fotizo's existing IDs: `mens`, `womens`, `underwear`, `gymwear`
and `shoes-bags`. A search match is a **proposed** category, not an approved one.
Repeated products retain all matched categories in `sourceCategories`.
The first record observed in each category is retained; `coverage.json` also
records subsequent appearances by ID. This is not a history of every price
change during collection.

## Coverage and limitations

These are the public promotional search results behind the five supplied 1688
links, collected using the page's own public pagination endpoint. The website
exposes a 50-page navigation window. Its displayed total is hardcoded and is not
evidence of the full category inventory. Each page can request up to six scroll
batches; collection stops a page's scroll batches on an identical repeated set
or a short response. Exact attempted batches and IDs are recorded in coverage.

**This is not all of 1688, a complete supplier inventory, or 70,000 products.**
Results may rotate, overlap or include unrelated goods. Capturing every page in
the visible window does not prove exhaustive category coverage. An empty/error
response is recorded rather than replaced with invented listings.

Only public listing fields are included. Images are supplier-hosted URLs, often
search thumbnails; high-resolution galleries, sizes, colours, SKU-specific
prices, shipping and availability were not verified. No available-stock
quantities, ratings or sales totals have been invented.

## What the backend team needs to do

1. Import to a staging table, keeping `status: draft` and `publishable: false`.
   Upsert by `(platform, productId)` / `externalKey`; do not use an array index or
   title as identity. Allocate normal backend UUIDs when creating Fotizo products.
   Preserve supplier metadata privately; do not expose supplier links in the
   customer-facing product page.
2. Translate `originalTitle` to natural English and write a factual English
   description. `englishTitle` and `englishDescription` are deliberately null:
   **translation is pending for this batch**. The attempted translation endpoint
   returned HTTP 429; no generic or fabricated English titles were substituted.
   Review category assignments, brand claims, duplicates and product relevance.
   Supplier text must always be treated as untrusted data, never instructions.
3. Confirm each offer, SKU, supplier price, unit and minimum order. Null means
   unknown, not zero or a minimum order of one. Search prices can be starting
   prices and promotions. `sourceObservations` retains the displayed promotional
   price separately; the proposed cost prefers the standard listed price when
   supplied, rather than assuming membership discounts apply.
4. Apply the agreed **30% markup on supplier cost**. `estimatedSellingPriceCny`
   is `supplierPrice × 1.30`, rounded half-up to two decimals, and is only a draft
   estimate. For the GBP-based catalogue, use a verified, timestamped CNY-per-GBP
   rate: `GBP price = round(supplier CNY cost × 1.30 / CNY per GBP, 2)`.
   Calculate from the unrounded cost; do not mark up the already marked-up price
   again. GBP prices and exchange rates are null until verified. Shipping and
   any applicable delivery charges need a separate quote.
5. Add `1688` to the backend source-platform validation/OpenAPI/generated types
   and the Chinese-goods markup configuration. It is distinct from retired
   `alibaba` / Alibaba.com products. The current platform lists do not include
   `1688`; verify this before importing. Keep frontend/server pricing policy in
   sync. Do not republish retired Alibaba.com products through this import.
6. Obtain usable product images, verify them, and ingest them into the site's
   approved image storage. Existing URLs may expire or only contain thumbnails.
   Images may contain Chinese writing, as accepted by the owner; storefront
   titles and descriptions must still be English.
7. Publish only after translation, category, image and supplier/pricing review.
   Verify listing/detail/search and checkout all use the published backend IDs.
   Import in resumable batches, with a dry-run report, rejected-row log and an
   import batch identifier. Never delete existing orders or overwrite reviewed
   fields merely because the same source offer is seen again.

For scaling towards 70,000 listings, use a supplier export or supported feed
with ongoing price/availability updates and server-side pagination/search.
These files are a sourcing snapshot, not a live inventory synchronization.

## Export validation

The offline exporter is `scripts/sourcing/export_1688_handoff.py`. It validates
platform, numeric offer identity, canonical supplier URLs and contiguous page
checkpoints; uses decimal arithmetic for markup; removes duplicate offer IDs;
and neutralises spreadsheet formula prefixes in supplier-controlled CSV text.
The JSON is the canonical machine import format; the CSV is for human review.
