# Catalogue browsing

The marketplace and Fotizo Shop use `GET /api/products` with channel-scoped server filtering and sorting. This release changes its response from an array to `{ items, total, page, pageSize, hasMore }`; deploy the API and frontend together. Home and buyer-dashboard previews request ten listings. Product detail/owner endpoints keep their existing shape.

## Query contract

OpenAPI and generated clients describe page (zero-based, up to 10000), pageSize (default 24, maximum 48), q (up to 120 characters), category, sort, minPrice/maxPrice, minRating, inStock and discounted. Prices are GBP base/display amounts; this is not an authoritative checkout quote. Unknown parameters, invalid booleans, fractional pages and reversed ranges return 400. The server strengthens generated validation because generic boolean coercion treats the string "false" as true.

Only published products in the selected channel are returned. Search matches title, current seller name or category, with SQL wildcard characters treated literally. Sorts are newest, price ascending/descending, rating and percentage discount. Creation time and ID break ties deterministically. Null/equal/lower original prices have no discount. Best-selling sorting is unavailable until real sales tracking exists.

Rows and matching total use one repeatable-read transaction. Offset paging can still shift between separate requests when inventory changes; it does not promise a fixed browsing snapshot across pages. An empty later page retains Previous/First page actions. Filtering or sorting resets the page. React Query keys contain channel and filters, so a delayed old query cannot replace current results.

`GET /api/products/categories?channel=...` returns all published category counts and one representative image per category, including out-of-stock listings. Counts do not reflect the current search or price filters. Shop departments normalize legacy display labels and specs.department to the existing department IDs. Homepage category cards use these aggregates; loading/failure never substitutes sample catalogue counts. Related-product queries return at most six published same-channel/category listings and never download the entire catalogue.

## Interface behavior

Both storefronts have working search, price, category, rating, stock and sort controls, explicit result ranges/totals, navigation, loading, empty and retry states. Search/price changes apply on form submission; the other filters apply immediately. Price inputs name GBP explicitly even when product display conversion uses another currency. Shop department links initialize/reset the category; in-page filters are local state, not persistent URLs. The shop's unsupported sales-ranking and expiring-deal claims were removed from the browsing page.

## Verification and limits

HTTP tests exercise real Express requests and isolated PGlite queries: paging beyond one page, stable ties, full-set sorting, combined filters, publication/channel boundaries, legacy departments, accurate aggregates, related products, literal search and malformed requests. Responses are parsed using generated Zod contracts. React tests cover navigation, filter resets, price validation, retries, changed department links, out-of-range recovery and delayed responses. Service tests verify bounded requests and no production mock fallback.

No schema migration is added in this batch; migrations 0001-0003 remain deployment prerequisites. Existing channel/status indexes apply. Hosted PostgreSQL query plans and load tests are still needed before large-scale use, especially for substring search, total counts and maximum offsets. Managed image storage and smaller list DTOs remain catalogue work; this change bounds rows, not the size of each existing image field. Browser/mobile/keyboard acceptance remains a staging task.
