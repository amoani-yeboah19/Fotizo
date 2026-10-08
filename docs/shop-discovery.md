# Shop discovery storefront

The shop keeps the Fotizo department list and navy/orange styling. Desktop uses a sticky category sidebar; mobile uses a collapsible category panel. The large promotional hero is replaced by a compact welcome, search, Lowest Prices and Top Picks panels, a personalised discovery rail, recently viewed items, and the normal paginated catalogue.

## Discovery and filters

- Lowest Prices uses the combined catalogue's ascending-price query. Prices remain currency-aware; estimates and delivery qualifications remain visible. No lowest-market-price or bestseller claims are invented.
- Top Picks is a deterministic, varied merchandising selection. It does not manufacture ratings, sales, urgency or discounts.
- Subcollections are title-derived navigation shortcuts. Women's and men's shoes use explicit title terms (including explicitly unisex listings); children's footwear and bags are excluded from adult footwear. Unknown audience/style stays available under the department's All selection.
- URLs such as `/shop?category=shoes-bags&collection=women-shoes` preserve the selection and work with browser navigation. Free-text search, sorting and pagination still apply.
- Filtering happens before pagination. Until backend taxonomy exists, the overlay retrieves the selected live department in bounded concurrent batches and filters it together with the complete sourced snapshot. Failed live requests retain the existing partial-listing notice. This is a transition strategy; the backend should add indexed subcategory/audience filters and counts to avoid fetching full departments as the published catalogue grows.

## Viewing history

Product detail views store only product ID, department, matched collection IDs and a timestamp on this browser. The newest 30 unique views from the last 30 days inform category/style ranking; already viewed products are excluded from recommendations and shown separately when available. New visitors see a varied selection. Interests are not inferred from external websites or sensitive identity traits.

Pause Personalisation clears saved views and stops recording. Clear Viewing History resets recommendations. Storage errors/corrupt entries do not prevent shopping. This is device-local, not account-linked or shared across devices, and browsing records are not sent to the backend. Backend/account-level recommendations would require a separate design.

## Validation

Coverage includes source/live pagination before facet filtering, gender/bag separation, deterministic recommendations, history deduplication/expiry/opt-out, and catalogue-page query behavior. An isolated browser check with mocked API responses verifies desktop (1440px) and mobile (390px), a women's-shoes deep link, viewed-item recommendations, recent items and pausing history. No purchase or database mutation is performed by this change.
