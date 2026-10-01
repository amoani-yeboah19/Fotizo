# Alibaba frontend catalogue

The Alibaba homepage supplied for this task is a marketplace entry point, not a single seller's shop. This batch contains 1,967 selected listings across all 21 active Fotizo departments. The expansion adds 1,488 listings while retaining all 479 previously sourced listings and their IDs. This is a category-covering selection, not an exhaustive Alibaba mirror.

- `alibaba-products.json` contains English supplier titles, image galleries, source product links and supplier metadata. Original image content is retained, including any Chinese writing. `sourcing.originalImage` retains the full-size source; gallery URLs request Alibaba's 720px rendition.
- `products.ts` merges these records with the existing local catalogue and removes matching old source listings. `VITE_USE_MOCK_SHOP` defaults to `true`; setting it to `false` selects the backend catalogue instead. The Vercel build uses the explicit `shop-preview` mode (allowing the local shop only, with live authentication and other backend services) and sets `VITE_USE_MOCK_SHOP=true` for this frontend review phase, overriding the backend setting in `.env.production`. Remove that build override and use production mode when switching to the backend catalogue. No database or backend endpoint was changed or populated.
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
