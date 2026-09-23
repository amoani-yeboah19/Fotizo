# Fotizo project review

Reviewed 23 September 2026. This is a source and configuration review with compilation checks, not a live penetration test or an exhaustive guarantee that every defect has been found. Findings about production behavior refer to the committed production configuration and this repository's backend; hosting environment overrides and separately deployed code were not inspected.

## Assessment

Fotizo is a partly implemented marketplace with a substantial React interface and a working foundation for database-backed authentication, listings, orders, and conversations. It is not ready for real transactions. Several screens promise completed actions that have no implementation, and the production configuration connects frontend features to missing API endpoints.

This report describes the original review baseline. Subsequent implementation is tracked in IMPLEMENTATION_STATUS.md; findings below remain as the historical audit rather than being silently rewritten as fixes land.

## Project map

| Area | Implementation |
| --- | --- |
| Workspace | pnpm monorepo, TypeScript, ten workspace projects including the root |
| Main web app | `artifacts/fotizo`: React 19, Vite, Wouter, TanStack Query, Tailwind, Radix components, React Hook Form, Zod |
| API | `artifacts/api-server`: Express 5, Zod validation, Pino logging |
| Database | `lib/db`: PostgreSQL through Drizzle; users, products, categories, services, orders, order items, conversations, messages |
| Authentication | Password hashing with bcrypt; JWT in an HttpOnly cookie; Google credential verification and deferred role selection |
| Shared taxonomy | `lib/service-taxonomy`: common service categories and groups |
| API tooling | OpenAPI, generated React client and Zod packages, currently describing only health checks |
| Other code | Mockup sandbox, catalogue import tools, seed and backfill scripts |
| Deployment | Vercel frontend; `/api/*` rewrite to a Render backend |
| Data modes | Independent mock switches; production enables real core APIs but retains a static shop catalogue |

## Release blockers and high-priority findings

**1. Checkout does not process a payment.** `artifacts/fotizo/src/features/payments/pages/CheckoutPage.tsx`, `artifacts/api-server/src/routes/orders.ts:70`. Card fields have no payment integration or validation. Advancing through blank fields still reaches order placement. The API immediately reduces stock and creates a pending order without payment authorization, a payment record, or a webhook. This allows unpaid orders to consume inventory. Implement a defined payment/order lifecycle or clearly disable purchasing until it exists.

**2. Delivery details are discarded.** `CheckoutPage.tsx`; `lib/db/src/schema/orders.ts`. Address, customer contact information, and country are uncontrolled inputs that never enter the order request. The database has no delivery address fields, and seller sales responses have no fulfilment details. Persist validated delivery snapshots and expose the appropriate information to the responsible seller.

**3. Shop products cannot pass real checkout validation.** `artifacts/fotizo/src/features/shop/pages/ShopProductPage.tsx:60`, `features/shop/components/ShopProductCard.tsx:20`, `artifacts/api-server/src/routes/orders.ts:17`. Both shop entry points prefix `productId` with `shop-`; the API requires a UUID. This fails even if the shop is switched to real API products. In addition, `.env.production` keeps the shop mocked while orders are real, so catalogue entries are not reliably backed by orderable database rows. Preserve canonical database IDs and publish one consistent inventory source.

**4. Currency conversion silently becomes 1:1.** `artifacts/fotizo/src/contexts/CurrencyContext.tsx:24`, `src/services/currency.service.ts:12`, backend route registry. Production requests `/currency/rates`, which is absent. The rejected promise is not handled and rates remain `{GBP:1, USD:1, GHS:1}`. A GBP price can therefore be displayed with a dollar or cedi symbol without conversion. Supply validated rates and disable conversion on failure; store the order's currency explicitly.

**5. Production support and vehicle enquiries target missing routes.** `features/support/services/support.service.ts:59`, `features/autos/services/autos.service.ts:35`, `.env.production`. `/support-requests` and `/vehicle-enquiries` are not implemented. These flags inherit the global production `false` mock setting. In mock mode, submissions live only in module arrays and disappear on reload. Implement persistence, retrieval and delivery to the responsible staff before presenting these as operational channels.

**6. Booking confirmation is fabricated.** `features/artisans/components/BookingDialog.tsx:37`. Confirming a date and time only displays “Booking confirmed!” and closes the dialog. It does not create a booking, identify a service/package by ID, check availability, require a session, or notify the provider. `/bookings` is also absent, although buyer dashboards request it. Connect the entire booking lifecycle before showing success.

**7. Private messages remain visible after logout.** `src/contexts/MessagesContext.tsx:53`, `src/contexts/AuthContext.tsx:103`, `features/messaging/pages/MessagesPage.tsx:13`, `MessageThreadPage.tsx`. The globally mounted message provider has no dependency on authentication and never clears conversations on logout. Poll failures preserve the previous data. Message pages do not guard access, so navigating to `/messages` after logout can still show the previous account's loaded conversations and thread contents. Reset state immediately, cancel stale requests, and guard private routes.

**8. Query caches are shared across account sessions.** `features/profile/hooks/index.ts:29`, `src/app/App.tsx`, `src/contexts/AuthContext.tsx:103`. Private keys such as `['orders']`, `['sales']`, and `['seller-products']` lack user IDs. Logout does not clear the shared QueryClient, whose stale time is one minute. Switching accounts can display the prior account's cached records until refetch. Namespace private queries by identity, gate them on session readiness, and remove/cancel private queries on account changes.

**9. Cookie-authenticated writes lack CSRF protection.** `artifacts/api-server/src/app.ts:40`, `src/lib/cookies.ts:14`, auth and conversation POST routes. Production cookies use `SameSite=None`, the server accepts URL-encoded form bodies, and no Origin validation or CSRF token is present. Cross-site forms can target string-only writes such as starting conversations or sending a known thread a message, where browser cookie policy permits. CORS response headers do not reject those writes. Validate request origins and/or use a CSRF token; reconsider `SameSite=None` now that the frontend uses a same-origin proxy. This is source-confirmed exposure, not a live exploit test.

**10. Login and registration have no abuse throttling.** `artifacts/api-server/src/routes/auth.ts`, `src/app.ts`. Only AI generation has a limiter. Password attempts, account creation, and expensive bcrypt work have no application-level rate limits. Add appropriate shared limits and monitoring. External infrastructure protections, if any, were not verified.

**11. Order requests are not idempotent.** `artifacts/api-server/src/routes/orders.ts:70`. Each successful request creates another order and decrements stock. If the response is lost after commit, a retry can duplicate the purchase. A disabled frontend button does not protect retries or multiple tabs. Introduce an idempotency key and a database uniqueness guarantee tied to the buyer and request.

**12. Checkout and stored totals disagree.** `CheckoutPage.tsx`, `artifacts/api-server/src/routes/orders.ts`. The browser adds 5.99 shipping for subtotals at or below 50; the API stores only the current product-price sum. It also silently reprices against current database prices without returning a revised quote for review. Server-side pricing is correct in principle, but shipping and price changes must be reflected in an authoritative checkout quote that the user accepts.

**13. Confirmation shows an unrelated order number and an unsent email.** `features/payments/pages/OrderConfirmationPage.tsx:8`. The order reference is generated with `Math.random()` on render; the API's real `orderId` is discarded by checkout. The page is directly accessible without an order and claims a confirmation email was sent, although no sender exists in this flow. Use an authenticated order lookup and an actual notification status.

## Security, authentication and state correctness

**14. Pending Google tokens pass the session verifier.** `artifacts/api-server/src/lib/jwt.ts:29`. Both token types share a key; the session verifier only casts the verified payload, unlike the pending-token verifier which checks its purpose. A local test confirmed a pending token is accepted despite missing `sub` and `role`. This proves a token-boundary defect; it does not demonstrate takeover of another account. Validate purpose, subject, role, issuer/audience as appropriate, and separate token purposes explicitly.

**15. Logout can appear successful while the server session remains active.** `features/auth/services/auth.service.ts:114`, `src/contexts/AuthContext.tsx:103`. The UI clears immediately, but the logout request is fire-and-forget and errors are swallowed. A failed request leaves the cookie valid and a reload can restore the session. Await completion, handle failure explicitly, and prevent stale session-bootstrap responses from restoring a logged-out user.

**16. Session restoration races route guards.** `src/contexts/AuthContext.tsx:38`, `src/components/layout/DashboardLayout.tsx:17`. The initial state is unauthenticated while `/auth/me` is loading. The dashboard redirects before the request completes. Valid users refreshing a dashboard can be sent to login. Model loading/authenticated/anonymous states separately.

**17. Dashboard access is not restricted by role.** `src/components/layout/DashboardLayout.tsx`, `src/routes/AppRoutes.tsx`, profile dashboards. The shared guard checks only whether a user exists. A buyer can navigate directly to staff and representative screens. Existing listing endpoints still apply server-side authorization, so this is not evidence of a current backend staff privilege escalation. Add route-level role checks and ensure future staff APIs enforce their own authorization.

**18. Sessions and role claims cannot be revoked promptly.** `artifacts/api-server/src/lib/jwt.ts:18`, `middlewares/requireAuth.ts`. Tokens last seven days; requests trust the signed role without checking current account state. Changing a role does not immediately remove privileges, and clearing a browser cookie does not invalidate a copied token. Add a session/version check or another explicit revocation strategy before operational staff access depends on this.

**19. Essential account management is absent.** `routes/auth.ts`, `lib/db/src/schema/users.ts`, `features/settings/README.md`. There are no password reset/change, email verification delivery, session management, account suspension, or persisted profile editing routes. These are missing capabilities rather than proof the current login endpoints are broken. Prioritize recovery and staff-controlled suspension for launch.

## Data integrity and unfinished workflows

**20. Order fulfilment has no transition API.** `routes/orders.ts`, `lib/db/src/schema/orders.ts`. Order items start pending but there is no API to ship, deliver, cancel, refund, or update tracking. There is no reservation expiry/restock workflow. Accepted message offers also only change a message status; they do not create a booking or order. Define and implement the business state transitions.

**21. Unpublished products cannot be loaded for editing.** `features/marketplace/pages/PostProductPage.tsx:53`, `services/catalog.service.ts:86`, `routes/products.ts:65`. Seller editing uses the public detail endpoint, which returns only active listings. Seller lists include unpublished products, including seeded shop inventory, but the edit flow cannot load their data. Add an owner-authorized detail endpoint and an explicit publish/unpublish interface.

**22. Services have creation but no owner management.** `artifacts/api-server/src/routes/services.ts`. There are no service edit, unpublish, delete, or owner-list endpoints. Providers can publish a service and then cannot maintain or withdraw it through this API.

**23. Conversation creation can produce duplicates.** `routes/conversations.ts:159`, `lib/db/src/schema/messages.ts`. Find-then-insert is described as idempotent, but there is no unique constraint on canonical participant pair plus subject. Concurrent requests can both insert. Canonicalize the pair and enforce uniqueness with conflict handling.

**24. Offer responses race.** `routes/conversations.ts:323`. The handler reads `pending` then updates by message ID alone. Concurrent accept/decline requests can both pass the check and overwrite the supposedly final answer. Make the update conditional on `offer_status = 'pending'` and check the affected row count.

**25. Message failures are concealed and read receipts are wrong temporarily.** `src/contexts/MessagesContext.tsx`. Failed sends remove the message silently after the composer has cleared; failed offers are ignored; `markAsRead` has no rejection handling and marks every message read, including outgoing messages whose recipient has not read them. Show failure/retry state, preserve drafts, and only advance the current user's read state.

**26. Shop versus marketplace separation relies on seller names.** `features/marketplace/services/catalog.service.ts:15`, `features/shop/services/shop.service.ts:61`. Marketplace exclusion uses editable display names, while live shop mode includes every product returned by `/products`. A name change or unrelated seller with a matching name changes classification; local inventory can appear under the shop's seller branding. Store and filter an explicit channel/source on the server.

**27. Operational dashboards mix real records and invented metrics.** `features/profile/pages/SellerDashboard.tsx:25`, `ManagerDashboard.tsx:17`, `RepresentativeDashboard.tsx`, `ChinaRepresentativeDashboard.tsx`, `features/profile/data/chinaSourcing.ts`, `routes/products.ts:149`. Seller revenue charts are fixed data and product sales are always zero. China dashboard totals derive from static catalogues and sample freight/supplier records despite “live source of truth” wording. Manager/developer metric endpoints are missing, with indefinite loading on errors. Label demos honestly and derive production metrics from persisted events.

**28. Wishlist and several visible controls are placeholders.** `BuyerDashboard.tsx:119`, `BuyerDashboard.tsx:163`, `ProductDetailPage.tsx:187`, `features/home/components/Newsletter.tsx`, manager and representative dashboards. Wishlist count is fixed at 8 and its list is `products.slice(2,8)`; the wishlist button does nothing. Newsletter submit only prevents default. Examples of inactive dashboard actions include Manage, Export CSV, moderation buttons, supplier management and Reorder; booking Join does not navigate to the meeting URL. Connect these actions or remove/disable them with clear explanations.

**29. Cart state is lost on refresh and retained across account changes.** `src/contexts/CartContext.tsx`. The cart exists only in a provider state array. Refresh removes it, but logout does not. Choose and implement deliberate guest/account cart ownership, persistence and merge behavior. Stock constraints are enforced by order creation, but the cart itself allows unavailable quantities; the shop adapter also discards stock data.

**30. Failed requests can look like empty or nonexistent records.** `BuyerDashboard.tsx`, `SellerDashboard.tsx`, `ManagerDashboard.tsx`, `features/shop/services/shop.service.ts:68`, `MessageThreadPage.tsx:41`. Dashboards default missing query data to empty arrays or perpetual loading. Shop detail converts every failure to “not found”; missing or unloaded conversations return a blank page. Distinguish loading, authorization, network/server errors, empty results and genuine 404s.

**31. Numeric validation does not match database storage.** `routes/products.ts:19`, `routes/services.ts`, numeric columns in `lib/db/src/schema`. Positive numbers have no price ceiling or two-decimal constraint; stock has no PostgreSQL integer upper bound. Values accepted by validation can overflow database columns, and sub-cent prices can round unexpectedly. Validate monetary precision and range; calculate totals using integer minor units or exact decimal arithmetic rather than unrestricted JS numbers.

**32. Listing media can consume excessive storage and response size.** `routes/products.ts:22`, `routes/services.ts`, `app.ts:39`, database schemas. The API accepts arbitrary image/avatar strings, product image arrays without item limits, and up to 10 MB request bodies. Inline base64 is stored in database rows and returned in catalogue reads. Move media to controlled object storage, validate content and limits, and return thumbnail metadata for lists.

**33. Public claims exceed implemented safeguards.** `features/company/pages/TrustSafetyPage.tsx`, `routes/services.ts:115`. The UI says card details are handled by a payment provider and providers are reviewed before listing. No payment integration exists here; service creation defaults directly to active without a review gate. Refund/buyer-protection operations are also not implemented. Verify real business procedures separately and align visible claims with functionality actually delivered; this is a product consistency finding, not a legal assessment.

## Engineering and operational gaps

**34. No automated application tests or CI checks were found.** There are no test scripts or application test files in the repository inventory and no checked-in CI workflow. Compilation cannot catch the cross-account state, checkout, or concurrency bugs above. Add meaningful integration tests for authorization, account switching, checkout retries/stock, booking persistence, and the production frontend/API contract.

**35. Deployment bypasses typechecking.** `vercel.json`, root and frontend `package.json`. Root build runs TypeScript checks, but Vercel builds the frontend directly using Vite. A future type failure can therefore still deploy. Run typechecks and tests in the actual deployment pipeline.

**36. Database schema changes have no committed migration history.** `lib/db/package.json`, `lib/db/drizzle.config.ts`. Scripts expose `drizzle-kit push` and `push --force`, but no versioned migration files were found. Introduce reviewed migrations and document safe deployment, backfill and recovery procedures. Actual deployed schema, backups and restore capability were not inspected.

**37. The OpenAPI contract covers only `/healthz`.** `lib/api-spec/openapi.yaml`. Core endpoint requests/responses are maintained separately in handwritten frontend types and server code. `api/client.ts` casts response data to generic types without runtime validation. This hides drift such as unused client order totals and inconsistent order status vocabulary. Extend the contract and use generated schemas/types for real features.

**38. Lists and message polling are unbounded.** `routes/products.ts:55`, `routes/services.ts:73`, `routes/orders.ts`, `routes/conversations.ts:110`, `MessagesContext.tsx:26`. List routes have no pagination. Every six seconds, the frontend fetches all conversations with all messages, even when logged out or not viewing messaging. Products include all image strings. Products, orders and conversation schemas lack secondary indexes for several ownership/history queries; services do have category/group indexes. Add pagination, incremental message retrieval, authenticated polling and measured indexes before load grows.

**39. Error handling and readiness are incomplete.** `artifacts/api-server/src/app.ts`, `routes/health.ts`, `src/index.ts`. No central JSON error handler is registered. Unexpected DB errors use Express defaults rather than the API's JSON format. Health always reports OK without checking database readiness. No graceful HTTP/pool shutdown is implemented. Registration's check-then-insert can also race into an unhandled unique violation. Add explicit error mapping, readiness and shutdown handling.

**40. Reproducible local setup is underdocumented.** There is no root setup README, backend environment example, `packageManager` pin or Node engine constraint. The root preinstall script assumes a POSIX shell and removes alternate lockfiles. Real local API mode defaults to `/api`, but Vite has no API proxy; developers must supply the backend URL themselves. Document required JWT/database/port/CORS/Google/AI settings, supported runtime versions and startup commands. The normal pnpm command in this environment attempted automatic dependency repair and aborted rather than running typecheck.

**41. The static shop catalogue is a large JavaScript payload.** Production build emitted `products-*.js` at 832.68 kB minified / 150.93 kB gzip, plus a 381.99 kB chart chunk. Route splitting is already present, which is good; the build still reports an oversized chunk. Measure actual route/network behavior, then move catalogue data to paginated API responses and keep charts isolated to dashboards. This was not a browser performance benchmark.

**42. Accessibility and smaller state issues need a focused pass.** Checkout labels are not connected to input IDs; the newsletter email input has no explicit label; parts of thread navigation use clickable divs. Persisted currency codes are cast rather than validated, so an unexpected localStorage value can make `currency` undefined. These are source observations, not a complete keyboard/screen-reader audit.

## What is already sound

- Real password authentication uses bcrypt and excludes password hashes from public user responses.
- Staff roles cannot be self-selected in public signup or Google role completion.
- Product writes check ownership; conversation routes check participation; offer responses reject the sender's own response.
- Order prices are loaded server-side, stock deductions are conditional and atomic, and order creation runs in a transaction.
- Order items snapshot product/seller details, preserving historical purchases when listings change.
- Product removal is soft deletion, protecting references from old orders.
- Shared service taxonomy prevents client-controlled group assignment.
- Feature-oriented frontend structure, shared UI components, service modules and lazy routes provide a workable base.
- Production uses a same-origin API proxy, and the demo role-picker route is build-gated.
- Secrets were not needed for this review; the tracked frontend production settings inspected are public Vite configuration, not backend credentials.

## Verification performed and limitations

- Direct installed TypeScript compiler: library project build, main frontend, API server, scripts and mockup sandbox all exited 0.
- Main frontend production Vite build succeeded. It emitted sourcemap diagnostics for label/tooltip components and an oversized chunk warning.
- A local, synthetic JWT test confirmed that a pending Google signup token passes `verifyAuthToken` without subject/role claims. No real identity or secret was used.
- Compared all frontend service endpoint calls against the API's registered routes and inspected committed production mock flags.
- Standard `pnpm typecheck` could not run normally: PowerShell script execution first blocked the shim; `pnpm.cmd` then attempted dependency repair and aborted with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. Direct compiler checks were used without replacing installed dependencies.
- Vite initially hit a sandbox filesystem restriction; the approved build outside the sandbox succeeded.
- No database migrations, seed scripts, live purchases, emails, or writes to remote services were performed.
- No browser-based visual/accessibility testing, live database integration tests, backend production startup test, dependency vulnerability audit, external infrastructure review, or Google/payment/AI provider integration tests were performed. Provider model availability/configuration remains unverified.
- README-only scaffolds include reviews, notifications, settings and other planned domains; their presence should not be counted as completed features.

## Recommended repair order

1. Block misleading transaction/booking success until implemented; fix canonical product IDs, currency behavior and the production endpoint mismatches.
2. Fix private state cleanup, identity-scoped caching, authentication loading/role guards, CSRF controls, auth throttling and token-purpose validation.
3. Finish authoritative quotes, delivery snapshots, payment verification, idempotent orders, fulfilment/cancellation, and real confirmation references/notifications.
4. Implement bookings, support/enquiry operations, listing management and staff workflows; remove or label remaining sample content and inactive actions.
5. Add contract and integration tests, versioned migrations and deployment checks; then address pagination, media storage, operational monitoring and accessibility.
