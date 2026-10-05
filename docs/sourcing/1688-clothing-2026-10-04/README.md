# 1688 clothing sourcing — backend handoff

This batch contains **unpublished sourcing drafts**, not checkout-ready products.
The owner requested files for the backend team; no database records or live shop
listings were created. Read `manifest.json` for final counts and capture coverage.

## Frontend correction — 5 October 2026

The separate collection preview has been removed. **3,239 product listings** are
integrated into the normal `/shop` catalogue, including its category filters,
search, sorting, pagination, product details and currency display. One result
(`1061382831632`) is a shipping/price-adjustment payment entry, not a product,
and is excluded from the storefront while retained in the capture for auditing.
Two more offers (`1078724552236`, `1079042165113`) are held back because their
supplier image URLs return HTTP 404. Their English drafts remain in the handoff;
they must have genuine replacement source photos before joining the storefront.

Product photos are downloaded, decoded and served from `/images/1688/` as WebP
assets rather than relying on supplier hotlinks. Original image content is
preserved, including Chinese writing. Each product currently has the single
image provided by the source search card; this is not a complete image gallery.

Product names and descriptions are concise English drafts derived from explicit
product types and attributes in supplier titles. Three unclear titles were
resolved by inspecting their source photos. These are not full translations of
all supplier marketing copy and remain subject to merchandising review. Names
no longer display category-plus-ID placeholders or untranslated descriptions.

Prices use the verified CNY-per-GBP rate recorded in the frontend's
`1688-pricing.json`, apply the agreed 30% markup once, and use Fotizo's normal
currency display. Supplier links, supplier cost and stock quantities are absent
from the new public catalogue. Original supplier metadata remains in this handoff.

No database records were created. Ordering for these frontend-only IDs remains
unavailable until the backend publishes real product IDs and confirms options.
No selectable colours/sizes or additional product images were invented.

**Captured: 3,242 unique offers**, after removing two cross-category duplicates.
All 50 exposed page numbers were checked for each category, with no recorded
request errors. This is coverage of the public search window, not the full
1688 inventory. The 3,241 product records now contain English copy drafts; review remains pending.

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
2. Review `englishTitle` and `englishDescription` against `originalTitle` and
   the supplier details. These are concise, source-derived English drafts, not
   complete translations of every marketing phrase. The translation endpoint
   returned HTTP 429; unsupported claims were not added to the English copy.
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
6. Ingest the locally downloaded images into the site's approved image storage
   during backend publication. Obtain higher-resolution galleries when available;
   some search images are thumbnails.
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
