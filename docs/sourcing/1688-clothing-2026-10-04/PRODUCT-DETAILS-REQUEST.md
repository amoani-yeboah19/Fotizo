# Full product details needed from the 1688 supplier

## Fotizo size requests — 6 October 2026

At the owner's request, clothing without verified variants now displays standard
Fotizo size-request controls in the frontend. These are shopper preferences,
not imported supplier options or a claim of stock. Men's and women's jeans and
trousers use waist labels in inches; other clothing uses XS–3XL. Accessories are
excluded. Existing verified variants always take priority.

The selector explains that fit and availability require confirmation. It does
not fabricate garment measurements or create supplier SKUs. Product cards link
to size selection instead of allowing quick-add to skip it. Requested sizes are
currently page-local selections; they are not submitted to the backend. Checkout
remains unavailable for these products until the backend can persist and confirm
the chosen option. The cart and order work in requirements 5–6 below is still
needed before customers can buy a particular size.

## Current access result — 5 October 2026

The full listing for offer `38412292988` returned a CAPTCHA redirect instead of
product data. No SKU, colour, size or size-chart data was present in the response.
The existing search-result capture does not establish those options. No new
options have been imported or inferred from product photos.

Use the offer IDs and internal source URLs in `products.json` or `review.csv`
to request a supplier export. A CSV, Excel workbook or JSON export is suitable.
Complete saved product-detail pages with their associated files can also be
checked, although dynamically loaded SKU data may not be included in saved HTML.
Do not provide account passwords, cookies or session tokens.

## Message to the supplier

Please send the complete product data for the attached 1688 offer IDs, including:

- Original product title, full description, materials and specifications.
- All product photos, detail images and any available product video.
- Every available colour and size, with original labels and colour-specific photos.
- Each actual SKU combination and its supplier SKU ID: for example, the exact
  colour and size sold together. A list of colours and a separate list of sizes
  is not enough to establish which combinations exist.
- Supplier price in CNY for each SKU, quantity-based price tiers, minimum order
  and sale unit (one item, pair, set, pack, etc.).
- Size charts and measurements, their units, and whether they describe body
  measurements or garment measurements. Include any stated measurement tolerance.
- Dimensions, weight, package contents, lead time and delivery terms, if supplied.
- Whether each SKU is currently orderable and when the information was updated.

Original Chinese labels are welcome; Fotizo will prepare English labels. Keep
offer IDs and SKU IDs unchanged so options stay attached to the correct product.

### 中文版本

请按附件中的1688商品ID提供完整商品资料（Excel、CSV或JSON均可），包括：

- 商品原始标题、完整详情、材质、规格参数、全部主图及详情图；如有视频也请提供。
- 全部可选颜色、尺码及颜色对应图片，并保留原始中文名称。
- 每个实际存在的颜色与尺码组合及其SKU编号，不要仅提供独立的颜色和尺码列表。
- 每个SKU的人民币价格、数量阶梯价、起订量和销售单位（件、双、套、包等）。
- 尺码表、各部位尺寸、计量单位，以及尺寸是人体尺寸还是成衣尺寸；如有误差范围请注明。
- 如有，请提供商品尺寸、重量、包装内容、备货时间及配送条件。
- 每个SKU当前是否可订购，以及资料更新时间。

请保留商品ID和SKU编号，便于准确匹配商品。无需提供账号密码或登录信息。

## Fotizo implementation requirements

1. Keep supplier URLs, costs and original IDs in internal sourcing metadata;
   customer pages must not link buyers to 1688.
2. Translate product details, option labels and chart headings into English,
   preserving original labels internally. Never invent missing measurements,
   certifications, materials or supplier options.
3. Show confirmed colours and sizes only for verified SKU combinations. Standard
   Fotizo size requests must remain explicitly distinct from confirmed options. Changing
   a colour should show its associated real photo when one is provided. Disable
   unavailable combinations; never form a Cartesian product of unrelated lists.
4. Calculate the price for the selected SKU using its supplier cost, the 30%
   markup and the recorded exchange rate. Respect price tiers and minimum orders.
5. Persist the SKU ID and selected options in cart lines, checkout, orders and
   supplier confirmation. Distinct SKUs of the same product need distinct cart
   lines: the current cart merges by product ID and must be extended first.
6. Validate SKU ownership, availability and pricing server-side. Store an order
   snapshot of the chosen labels and price. Do not trust client-supplied prices.
7. Do not show available-stock quantities to customers. Unknown availability is
   not proof that an option is in stock; require supplier confirmation as needed.
8. Support image gallery, English description/specifications, and a size-guide
   table with explicit units in Fotizo's existing colours and page layout.

Until this data is supplied and checked, the current single-photo listings are
not complete 1688 product-detail imports. The existing shop remains unchanged by
this access check.
