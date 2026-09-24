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
| Production data | Shop uses real published API inventory; release build rejects mock overrides/demo identities | Build-policy tests and production build |
| Account settings | Authenticated display-name editing, current-password changes, atomic all-session revocation, Google-only handling, same-origin cross-tab session checks | HTTP ownership/validation/concurrency/rollback tests and React form/session tests |
| Display currency | Invalid/unavailable rates retain GBP display and hide unavailable conversions | React currency tests |
| API operations | Separate database/schema readiness, startup prerequisite check, bounded connection acquisition, graceful request draining and database shutdown | HTTP schema/readiness tests, concurrent probe test, actual in-flight HTTP shutdown and deadline tests |
| Engineering | Versioned migration runner, additive session/channel SQL, Windows-compatible scripts, pinned runtime/package manager, CI checks, local API proxy and setup documentation | Locked dependency installation, typechecking, tests and builds |

## Verification record

Final account-settings and API-operations batch: `pnpm run check` passed all TypeScript projects, all 55 tests across seven files, and API/frontend/mockup production builds. This includes cross-tab state clearing, password-change concurrency and rollback, stale-credential session issuance, readiness failure/recovery, concurrent probes, active HTTP request draining and shutdown deadlines. API client/schema generation succeeded. A smoke test of the built API against an intentionally unavailable local database exited with code 1 before listening, as expected. The earlier foundation batch passed 29 tests. `git diff --check` passed.

API tests use an isolated PostgreSQL engine in WASM, bcrypt and actual HTTP requests. Session and currency tests use React with jsdom. SQL migration application/reapplication is tested against a synthetic previous schema. The migration runner's lock/checksum/transaction logic is source-reviewed; it has not been exercised against a hosted database or the actual production schema.

Browser visual/mobile/keyboard acceptance remains pending: the browser tool reported no connected browsers after an initial connection timeout. This is not covered by passing jsdom tests. The temporary frontend server was stopped after the attempt. No live database migration, hosting change, payment, email or production seed was performed.

Builds currently emit source-map warnings for the UI label/tooltip modules and a large catalogue chunk warning. These do not fail compilation, but production bundle size and those warnings remain cleanup work.

## Deployment prerequisites for these changes

1. Inspect the target schema and take a verified backup. Follow README.md to apply 0001 and 0002 using the migration runner before this API version starts. Do not use schema push on production.
2. Configure a strong JWT_SECRET, exact CORS_ORIGIN values and the verified trusted-proxy hop count. Existing tokens require a fresh sign-in.
3. Deploy frontend and API together because writes now require X-Fotizo-Request. Verify actual proxy forwarding, secure cookies and revocation in staging.
4. Publish only reviewed shop inventory. Empty/unpublished inventory must stay unavailable.
5. Complete browser acceptance, hosted PostgreSQL migration/rollback rehearsal and operational checks before release.

## Remaining work, in delivery order

| Stage | Remaining scope | Dependencies |
| --- | --- | --- |
| Foundation | Recovery/verification tokens and delivery, email/avatar profile changes, suspension/admin controls, operational logging/alerts | Email delivery configuration; staging environment |
| Catalogue and inventory | Shared API contracts, pagination, managed media, safe import/seed operations, server-backed carts, inventory/reservation model, full owner-edit browser acceptance | Inventory and media-storage decisions |
| Commerce | Market configuration, currency/minor-unit money model, authoritative quotes, saved delivery snapshots, idempotent order lifecycle and reservations | Market, shipping, tax/duty and stock policies |
| Money and fulfilment | Hosted payments, verified webhooks, ledger, refunds, reconciliation, fulfilment evidence, dispute holds, payout eligibility and seller onboarding | Selected provider; platform fee, release timing and fulfilment rules |
| Services | Provider availability, persisted booking lifecycle, concurrency/timezones, cancellation/refunds and notifications | Booking rules and applicable payment/email integration |
| Support and operations | Persisted support/vehicle workflows, staff queues, evidence/audit trail, real dashboard metrics, escalation and notification delivery | Domain policies and role permissions |
| Release | Production schema adoption, staging end-to-end tests, accessibility/mobile checks, monitoring, backup/restore and acceptance sign-off | All enabled workflows complete; launch market selected |

All 42 original audit findings remain in PROJECT_REVIEW.md. Mitigating an unsafe flow by disabling it does not mean the missing business feature is complete. Tests added so far cover the changed foundation, catalogue and account-settings behavior, not every existing route or screen. Readiness covers database access and the new security/catalogue columns; it is not a complete release acceptance check. Hosted database timeout behavior and actual host signal/grace-period settings still need staging verification. Cross-tab notification is limited to the same origin and available browser storage; other-device cached screens are not remotely erased, although revoked sessions are rejected by the API.
