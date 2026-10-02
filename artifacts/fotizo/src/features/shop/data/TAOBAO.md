# Taobao saved-page import — 2 October 2026

The user supplied four saved search pages: computer accessories (47 cards), menswear (47), furniture (47), and industrial parts/consumables (49). All 190 cards are preserved in `taobao-import-manifest.json`, with canonical product links, supplier CNY prices, Chinese titles, English titles and original saved images. No scripts from the saved page were executed. Account identifiers, tracking parameters, cookies and unrelated page content are not included.

`taobao-products.json` publishes 184 physical-product listings: Computers 44, Men's Clothing 47, Furniture 47, and Industrial Parts & Supplies 46. Three PC-build consultation offers and three machining-service offers are preserved in the manifest only. They are not presented as physical goods. Furniture and Industrial Parts & Supplies are new departments. No appliance page has been supplied.

Images present in the saved folders are copied unchanged; 47 missing local images were retrieved from the original alicdn.com URLs. All product images are served locally. Images are copied unchanged into `public/images/taobao/` and served locally. The search cards provide one image each; no additional gallery images, variants, stock counts, ratings, shipping promises or sales numbers were invented. Mixed English/Chinese saved titles were rewritten in English; compatibility and capacity alternatives are not selectable verified SKUs.

Prices use the displayed supplier CNY price × 0.1130 GBP/CNY × 1.30, rounded once to two decimal places. The fixed exchange-rate snapshot is from [Wise, 2 October 2026](https://wise.com/gb/currency-converter/cny-to-gbp-rate/history/02-10-2026). It is an estimate, not a live or guaranteed checkout rate. Saved promotion labels (first-order, subsidy or discount) are preserved and require confirmation before purchase. Supplier price fragments altered by browser translation were reconstructed: `.twenty one` → `.21`, and a decimal fragment such as `0.54` is added to the integer part, not concatenated as `50.54`.

Backend handoff: use platform + product ID for deduplication, keep Fotizo IDs stable, confirm supplier prices, eligibility, chosen variants and compatibility, then calculate final shipping and currency conversion server-side. No database changes or Taobao purchasing occurred.

Industrial prices are starting estimates and may represent a length, component, custom variant or other unit not specified on the search card. Those units, dimensions and machining requirements must be confirmed. Furniture pricing excludes confirmed freight/assembly quotes. English titles omit unsupported authenticity and promotional claims; original seller titles remain available in the manifest. The Alibaba sourcing tool targets its configured Alibaba categories; the two new Taobao departments are not treated as missing Alibaba imports.

## Expanded saved-page batch

A further 15 supplied files produced 566 new unique source listings, after deduplication against previous imports and within the batch. The repeated industrial, furniture and menswear files add no duplicate products. The full source-file list and per-file import totals are in `taobao-batch-report.json`.

547 additional physical-product listings are published, bringing Taobao to 731 products. All 756 unique source records are retained. Nineteen new deposit-only, digital-document, software/account, tutorial, design and toll-registration service offers are retained in the manifest without appearing as physical goods (25 held listings including the earlier batches).

New Office Supplies, Clocks and Smart Devices departments accompany the existing categories. Cross-category results are assigned by product type where identifiable. Supplier prices with translated number words (for example “twenty three”) are normalized numerically before applying the existing recorded GBP conversion and 30% markup. Forty-one remotely referenced images missing locally were retrieved from their original supplier image URLs and stored without editing; image extensions match their encoded format.

Mobile-phone model, storage and condition claims remain supplier descriptions, not verified authenticity guarantees. Smart-device connectivity, data plans and regional services need confirmation. Building-material prices may represent samples or selected dimensions; unit of sale must be confirmed. Saved brand-authenticity and promotional language is not treated as a Fotizo guarantee. Scripts and account details from the source documents are not imported.
