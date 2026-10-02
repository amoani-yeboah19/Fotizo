# Taobao saved-page import — 2 October 2026

The user supplied a saved computer-accessory search page and its accompanying image folder. The snapshot contains 47 listing cards. All 47 are preserved in `taobao-import-manifest.json`, with canonical product links, supplier CNY prices, Chinese titles, English titles and original saved images. No scripts from the saved page were executed. Account identifiers, tracking parameters, cookies and unrelated page content are not included.

`taobao-products.json` publishes 44 physical-product listings into Computers. Three PC-build consultation offers (¥0.90, ¥0.01 and ¥0.03) are preserved in the manifest pending a decision about offering those services; they are not presented as physical PCs or free products. No additional search pages, furniture listings or appliance listings were supplied in this file.

Images are copied unchanged into `public/images/taobao/` and served locally. The search cards provide one image each; no additional gallery images, variants, stock counts, ratings, shipping promises or sales numbers were invented. Mixed English/Chinese saved titles were rewritten in English; compatibility and capacity alternatives are not selectable verified SKUs.

Prices use the displayed supplier CNY price × 0.1130 GBP/CNY × 1.30, rounded once to two decimal places. The fixed exchange-rate snapshot is from [Wise, 2 October 2026](https://wise.com/gb/currency-converter/cny-to-gbp-rate/history/02-10-2026). It is an estimate, not a live or guaranteed checkout rate. Saved promotion labels (first-order, subsidy or discount) are preserved and require confirmation before purchase. Supplier price fragments altered by browser translation were reconstructed: `.twenty one` → `.21`, and a decimal fragment such as `0.54` is added to the integer part, not concatenated as `50.54`.

Backend handoff: use platform + product ID for deduplication, keep Fotizo IDs stable, confirm supplier prices, eligibility, chosen variants and compatibility, then calculate final shipping and currency conversion server-side. No database changes or Taobao purchasing occurred.
