# Implementation status

Updated 24 September 2026. Work is local and has not been deployed. The complete system is not release-ready; this document distinguishes implemented safeguards from finished business workflows.

## Confirmed direction

- Prepare Ghana, UK and US; activate the first market later.
- Fotizo collects payments and pays sellers/providers after fulfilment.
- Core commerce first, then services and operations, as specified in COMPLETION_PLAN.md.
- Payment-provider and transactional-email choices are deferred at the user's request. Neither integration is considered configured or approved.

## Implemented in this batch

| Area | Result | Verification |
| --- | --- | --- |
| Sessions and authorization | Purpose-bound JWTs, persisted sessions, revocable logout, current database roles, account suspension checks, production secret validation | HTTP tests exercise real Express routes and PostgreSQL queries using isolated PGlite |
| Browser write protection | Explicit CORS origins, required custom request header, SameSite=Lax cookies, shared authentication rate limits including route aliases | Cross-origin/form rejection, concurrent limits, expiry and HTTP 429 tests |
| Private frontend state | Session-loading/error states, role guards, account-scoped query caches, message/cart clearing, late-response protection, logout retry | React lifecycle tests cover restore, account switches, stale responses and server failure |
| API failures | JSON parse/size/conflict/service errors, credential-safe error metadata, private no-store responses | Malformed JSON and concurrent duplicate-registration tests |
| Transaction honesty | Checkout and booking unavailable; unpaid order creation disabled; no invented confirmations or card collection | HTTP order-creation rejection; frontend source review |
| Catalogue | Explicit marketplace/shop channel; owner reads of unpublished listings; republishing; current-role mutation checks; numeric bounds and canonical cart product IDs | HTTP ownership, publication, channel-spoofing and validation tests; frontend typechecking |
| Catalogue browsing | Bounded marketplace/shop pages, working server-side filters/sorts, matching totals, full-channel category counts and bounded related items | API paging/filter/privacy/contract tests, React navigation/failure tests and production service tests |
| Production data | Shop uses real published API inventory; release build rejects mock overrides/demo identities | Build-policy tests and production build |
| Account settings | Authenticated display-name editing, current-password changes, atomic all-session revocation, Google-only handling, same-origin cross-tab session checks | HTTP ownership/validation/concurrency/rollback tests and React form/session tests |
| Manager account controls | Buyer/seller search and counts, suspension/reactivation, session revocation and transactional audit records; protected staff accounts | API role/concurrency/rollback/pagination tests and manager UI/client tests |
| Support and vehicle enquiries | Persisted public support requests and vehicle enquiries with references, rate limits, account linking and enquiry snapshots; manager/China-desk queues with versioned status changes and transactional case history | HTTP validation, rate-limit, role, concurrency (200/409), transition and history tests; React queue/conflict tests |
| Vehicle catalogue | Database-backed vehicles, published-only public reads, staff publish/unpublish, reviewed JSON import script defaulting to unpublished; the frontend no longer bundles a vehicle list | HTTP publication/role tests, import dry-run |
| Staff reporting | Manager, representative and China-desk dashboards read overview figures, seller/order lists and queues from stored records; fabricated sales, sellers, suppliers, shipments, API keys and request logs removed; unavailable workflows say so | HTTP aggregate/role tests (including a correlated-subquery defect found and fixed), React overview/retry tests |
| Developer console | Measured in-process request statistics, readiness and migration ledger; no identifiers or query strings retained | HTTP redaction and role tests |
| Display currency | Server rate endpoint with validation, six-hour cache, 48-hour stale limit and 503 on failure; invalid/unavailable rates retain GBP display | HTTP source success/failure/invalid-rate tests and React currency tests |
| API operations | Separate database/schema readiness, startup prerequisite check, bounded connection acquisition, graceful request draining and database shutdown | HTTP schema/readiness tests, concurrent probe test, actual in-flight HTTP shutdown and deadline tests |
| Engineering | Versioned migration runner, additive session/channel/account-audit SQL, Windows-compatible scripts, pinned runtime/package manager, CI checks, local API proxy and setup documentation | Locked dependency installation, typechecking, tests and builds |

## Verification record

Design restoration: at the user's direction every dashboard, the product detail page, the home category carousel and the navbar dropdown were returned to their original markup; only data sources changed. Seller, buyer, representative, developer and China-desk figures now come from the account's orders and listings, /api/operations and /api/developer/stats; lists with no backing records (bookings, wishlist, approvals, API keys, webhooks, suppliers, shipments) render empty in their original cards. Seller products now report real units sold and ratings. Managers gained Support and Vehicle enquiries sections; the China desk's Autos section gained the enquiry queue and publish controls. The 19 vehicles previously bundled in the frontend were imported and published through the import script (after fixing its array parameters) and the local autos page matches the hosted page. The product detail page again shows its original shipping/guarantee lines and appended description text, which remain unverified claims (review finding 33). `pnpm run check` passed: 105 tests and all builds.

Navigation and catalogue follow-up: the live database's user_role type lacked representative and china_representative, so no China-representative account could exist to stock the shop; migration 0005 adds both roles and the test schema now starts from the deployed four-role type. Applied to the Supabase database. The navbar and mobile "Fotizo Marketplace" links pointed at an absolute deployed URL the in-app router cannot follow; they now use /products, and the dropdown no longer overflows the viewport. The home category carousel shows marketplace categories while no shop inventory is published, marketplace category links filter the listing, and an unstocked shop says so instead of blaming filters. `pnpm run check` passed: all TypeScript projects, 106 tests across thirteen files and all builds.

Operations batch: `pnpm run check` passed all TypeScript projects, all 105 tests across thirteen files, and API/frontend/mockup production builds. Migrations 0001-0004 were applied with the migration runner to the Supabase database configured in artifacts/api-server/.env at the user's direction; the API reported ready afterwards and live rates, vehicles and the autos/support pages were checked in the browser. No test support requests, enquiries or vehicles were written to that database. Buyer and seller dashboards now derive their figures from the account's own orders and sales; bookings and wishlist state that they are unavailable. Product pages no longer show invented shipping, guarantee or description text.

Catalogue-browsing batch: `pnpm run check` passed all TypeScript projects, all 91 tests across eleven files, and API/frontend/mockup production builds. A pagination test that clicked Next before the reset page had loaded now waits for that page; the component correctly disables pagination while fetching. `git diff --check` passed. Browser acceptance against a running API and database remains pending.

Manager account-controls batch: all TypeScript projects, all 73 tests across nine files, and API/frontend/mockup production builds passed. The initial `pnpm run check` stopped after 64 passing tests when Vitest timed out starting the manager-UI worker; a full test rerun passed all 73, followed by a successful `pnpm run build` (including typechecking). The new tests cover manager permissions, protected staff accounts, suspension/reactivation and stale sessions, concurrent status changes, audit-write rollback, account search/pagination, generated API contracts, confirmation/error states and the generated client write header. Readiness fails without migration 0003 and recovers when the schema is restored. API client/schema generation and `git diff --check` passed.

Previous account-settings and API-operations batch: `pnpm run check` passed all TypeScript projects, all 55 tests across seven files, and API/frontend/mockup production builds. This includes cross-tab state clearing, password-change concurrency and rollback, stale-credential session issuance, readiness failure/recovery, concurrent probes, active HTTP request draining and shutdown deadlines. API client/schema generation succeeded. A smoke test of the built API against an intentionally unavailable local database exited with code 1 before listening, as expected. The earlier foundation batch passed 29 tests. `git diff --check` passed.

API tests use an isolated PostgreSQL engine in WASM, bcrypt and actual HTTP requests. Session and currency tests use React with jsdom. SQL migration application/reapplication is tested against a synthetic previous schema. The migration runner applied 0001-0005 to the hosted Supabase database on 24 September 2026; rollback and restore have not been rehearsed.

Browser visual/mobile/keyboard acceptance remains pending: the browser tool reported no connected browsers after an initial connection timeout. This is not covered by passing jsdom tests. The temporary frontend server was stopped after the attempt. No live database migration, hosting change, payment, email or production seed was performed.

Builds currently emit source-map warnings for the UI label/tooltip modules and a large catalogue chunk warning. These do not fail compilation, but production bundle size and those warnings remain cleanup work.

## Deployment prerequisites for these changes

1. Inspect the target schema and take a verified backup. Follow README.md to apply 0001-0005 using the migration runner before this API version starts. Do not use schema push on production.
2. Configure a strong JWT_SECRET, exact CORS_ORIGIN values and the verified trusted-proxy hop count. Existing tokens require a fresh sign-in.
3. Deploy frontend and API together because writes require X-Fotizo-Request and public product lists now return a bounded page envelope instead of an array. Verify actual proxy forwarding, secure cookies and revocation in staging.
4. Publish only reviewed shop inventory. Empty/unpublished inventory must stay unavailable.
5. Complete browser acceptance, hosted PostgreSQL migration/rollback rehearsal and operational checks before release.

## Remaining work, in delivery order

| Stage | Remaining scope | Dependencies |
| --- | --- | --- |
| Foundation | Recovery/verification tokens and delivery, email/avatar profile changes, staff-account permission policy and broader administrative controls, operational logging/alerts | Email delivery configuration; staging environment |
| Catalogue and inventory | Extend shared contracts to remaining catalogue mutations/owner routes; owner-list pagination, managed media, safe import/seed operations, server-backed carts, inventory/reservation model, full owner-edit browser acceptance | Inventory and media-storage decisions |
| Commerce | Market configuration, currency/minor-unit money model, authoritative quotes, saved delivery snapshots, idempotent order lifecycle and reservations | Market, shipping, tax/duty and stock policies |
| Money and fulfilment | Hosted payments, verified webhooks, ledger, refunds, reconciliation, fulfilment evidence, dispute holds, payout eligibility and seller onboarding | Selected provider; platform fee, release timing and fulfilment rules |
| Services | Provider availability, persisted booking lifecycle, concurrency/timezones, cancellation/refunds and notifications | Booking rules and applicable payment/email integration |
| Support and operations | Persisted support/vehicle workflows, staff queues, evidence/audit trail, real dashboard metrics, escalation and notification delivery | Domain policies and role permissions |
| Release | Production schema adoption, staging end-to-end tests, accessibility/mobile checks, monitoring, backup/restore and acceptance sign-off | All enabled workflows complete; launch market selected |

All 42 original audit findings remain in PROJECT_REVIEW.md. Mitigating an unsafe flow by disabling it does not mean the missing business feature is complete. Tests added so far cover the changed foundation, catalogue, account-settings and manager-control behavior, not every existing route or screen. Readiness covers database access and the new security/catalogue/account-audit columns; it is not a complete release acceptance check. Hosted database timeout behavior and actual host signal/grace-period settings still need staging verification. Cross-tab notification is limited to the same origin and available browser storage; other-device cached screens are not remotely erased, although revoked sessions are rejected by the API.
