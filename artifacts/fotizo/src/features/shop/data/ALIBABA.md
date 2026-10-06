# Alibaba frontend catalogue

## Selective frontend restoration — 6 October 2026

The owner's follow-up restores another 617 listings from previously empty
departments: Mum & Baby 100, Beauty 64, Home Textiles 93, Phones 95, Sports
Furniture 75, Global 100 and Entertainment 90. Furniture and Clocks have no
archived records to restore. The restored snapshot now contains 979 listings.
Only these 617 additions receive the approved 10% reduction: the archived GBP
selling estimate is multiplied by 0.90 and rounded half-up to two decimals.
`originalPrice` retains the archived selling estimate, so the storefront shows
the reduction and includes these products in discount filters. GHS display uses
the existing currency conversion; the exchange rate itself is not discounted.
The previously restored 362 listings retain their prices. These remain frontend
estimates pending backend publication and supplier confirmation.

The owner requested Wigs & Hair, Pet Supplies, Winter Jackets and Jewellery back
in the shop. `restored-alibaba-products.json` contains 362 archived listings:
100 wigs/hair, 100 pet supplies, 100 winter jackets and 62 jewellery items.
Jewellery is selected from the old accessories titles and has its own category;
watches, sunglasses, gold bars and other Alibaba departments remain excluded.
The normal sourced shop feed, product details and related products now load
this snapshot. Customer data omits supplier links and stock quantities.

This restoration changes the frontend only. Archived price estimates and image
galleries are retained; one photo per restored category was checked successfully.
`requiresPublication` stays true until the backend team restores/reviews the
matching records and confirms prices, supplier terms and orderable options.
The API launch filter still excludes retired Alibaba database records; it should
be replaced with an approved per-product allowlist when backend publication is
ready. Preserve the private supplier IDs in `alibaba-products.json` for that work.

The original sourcing notes below describe the earlier import, not its current
publication status.

The Alibaba homepage supplied for this task is a marketplace entry point, not a single seller's shop. This batch contains 1,967 selected listings across all 21 active Fotizo departments. The expansion adds 1,488 listings while retaining all 479 previously sourced listings and their IDs. This is a category-covering selection, not an exhaustive Alibaba mirror.

- `alibaba-products.json` contains English supplier titles, image galleries, source product links and supplier metadata. Original image content is retained, including any Chinese writing. `sourcing.originalImage` retains the full-size source; gallery URLs request Alibaba's 720px rendition.
- `products.ts` merges these records with the existing local catalogue and removes matching old source listings. `VITE_USE_MOCK_SHOP` defaults to `true`; setting it to `false` selects the backend catalogue instead. These records have been imported into the database (`scripts/src/import-shop-catalogue.ts`), and the Vercel build now uses production mode, so the live shop is served by the backend catalogue. The `shop-preview` mode (local shop with live authentication and other backend services) remains available for frontend catalogue review. Old catalogue IDs such as `ali-…` and `taobao-…` still resolve on the API, so existing product URLs and saved products keep working.
- `alibaba-sourcing-report.json` records capture time, department counts, readable source pages and any failed pages. A page failure does not mean every product in that department is unavailable.
- Alibaba category pages are discovery snapshots. Stock, variants, shipping eligibility, final prices and seller fulfilment have not been verified. Source price ranges are preserved as reported; quantity-specific tiers are not inferred from those ranges.

## Prices and ordering

Display prices use: lowest quoted USD price divided by the app's fixed 1.27 USD/GBP rate, multiplied by the approved 1.30 markup (30% on supplier cost), rounded to two decimals. This is a frontend estimate, not a current exchange-rate quote or approved landed selling price. Cards and detail pages label it accordingly. Supplier minimum orders, quoted ranges and units are shown on detail pages. These records do not claim Fotizo can fulfil single units below supplier minimums.

Do not add or display available-stock quantities for these imported listings. Supplier minimum order quantities describe purchasing requirements, not available inventory.

The batch does not invent ratings, sales counts, discounts, stock quantities, variants or free shipping. The existing local cart remains a frontend interaction; it does not purchase from Alibaba. Backend checkout integration must establish validated prices, minimum quantities, variants, stock and fulfilment before taking orders against these records.

## Backend handoff

Use `sourcing.platform` + `sourcing.productId` as the external identity, and retain `id` as the Fotizo route/cart identity. Preserve `sourceUrl`, raw English title, original images, capture time, supplier currency, price range, minimum order and unit. Replace preview prices with approved prices and confirm permission to reuse supplier content before production publication. Refresh inventory and pricing through the eventual supplier integration; this file performs no live sync.

## Refresh

From the repository root:

```sh
node artifacts/fotizo/tools/source-alibaba-catalogue.mjs
```

The tool reads current department IDs from `categories.ts`, fetches public Alibaba category pages with bounded concurrency, applies category relevance filters, and keeps up to 100 unique supplier products per department, preserving previously imported listings. It preserves existing matching IDs. It writes frontend JSON only and refuses to replace the catalogue if any department has no usable listings. It does not bypass login or CAPTCHA challenges. Review the resulting products and report before accepting a refresh; supplier search results change.

Current department counts are recorded in `alibaba-sourcing-report.json`. Each department has more listings than before the expansion. A final relevance review removed phone spare parts and electronic control components. Image checks sample source images; they do not verify every image in every gallery.

Older inline Alibaba entries without stored supplier quotes were repriced by removing their previous 2.2 multiplier and applying 1.3; their base costs are approximate because the old display prices were already rounded.
