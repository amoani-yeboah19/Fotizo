# Fotizo full-system completion plan

Status: implementation in progress. Market preparation, money flow and sequencing are confirmed; remaining business rules are pending. See IMPLEMENTATION_STATUS.md for implemented changes, verification evidence and remaining gates.

This plan turns PROJECT_REVIEW.md into an end-to-end delivery programme. It includes all existing product areas; sequencing a feature later does not remove it from scope. Dates and effort estimates should be assigned after the business rules and staging integrations are settled.

Confirmed direction:

- Prepare for the currently intended Ghana, UK and US markets; choose which market to activate first later. Adding another market remains an explicit scope decision.
- Fotizo collects customer payments and pays sellers/service providers after fulfilment.
- Complete core commerce first, then services and the broader operational system. Essential support, refund and staff controls ship with commerce rather than waiting until the end.
- Configure markets independently: supported addresses, price/charge currency, payment methods, delivery zones, policy versions and feature availability. Prepared does not mean enabled for transactions before the necessary integrations and rules are verified.

## 1. What complete means

A feature is complete only when its interface, API, database persistence, authorization, validation, error handling and operational workflow work together. A successful toast, passing build or populated dashboard is insufficient evidence.

Every applicable feature must satisfy these conditions:

- Real data persists across refreshes, browser sessions and deployments.
- The correct roles can perform the action; unauthorized users cannot read or mutate another account's records.
- Loading, empty, validation, success, permission, expired-session and failure states are usable.
- Retries and concurrent requests do not create duplicate side effects or corrupt state.
- Relevant staff can see and resolve the resulting work.
- Notifications link to real records and reflect actual delivery state.
- Mobile, keyboard and accessible form behavior are verified.
- Meaningful automated tests and a staging acceptance scenario pass.
- Migrations, monitoring and recovery instructions accompany operational changes.
- Public wording describes the behavior that actually exists.

A feature intentionally unavailable at launch must be visibly unavailable; it cannot display fabricated success or operational figures. Demo builds stay separate from production.

## 2. Business decisions to settle

The user has deferred payment-provider and transactional-email selection because no existing providers are known. Continue independent engineering work; do not infer a provider choice or activate payments/email delivery.

The following choices must be recorded before dependent integrations are finalized. Independent foundation work can proceed while these are pending.

| Decision | Why it matters | Needed before |
| --- | --- | --- |
| First active market and market-specific currency rules | Ghana/UK/US preparation is confirmed; activation, charge/settlement currencies and availability still need selection | Checkout activation |
| Payment methods and provider | Cards/mobile money, hosted payment UI, webhooks, refunds and reconciliation | Payment implementation |
| Collection implementation and payout eligibility rules | Platform collection and post-fulfilment payout are confirmed; provider capabilities, evidence of fulfilment, dispute holds and release timing remain to be defined | Payment schema freeze |
| Platform fees, settlement timing and seller onboarding | Determines balances, commissions, payout eligibility and staff operations | Seller finance |
| Tax, duties and invoice requirements | Determines authoritative quotes and imported-goods totals; rules need business/accounting confirmation | Production pricing |
| Delivery model | Seller shipping, Fotizo dispatch or carrier integration; supported zones and rates | Fulfilment |
| Inventory model | Stock held locally, supplier stock, preorder or quote-only goods need different promises | Shop publication |
| Booking model | Instant confirmation or provider approval, duration, timezone, cancellation, deposits and online/in-person delivery | Service bookings |
| Vehicle workflow | Enquiry, formal quotation, deposit if applicable, sourcing, shipping and handover | Autos operations |
| Account approval and staff permissions | Determines provider/seller verification and who can approve payouts, listings and refunds | Admin workflows |
| Hosting and operational integrations | Database, media storage, email, background jobs and monitoring | Staging setup |

No payment provider, technical fund-custody arrangement or fee schedule is considered approved by this document. Provider capabilities and applicable requirements must be verified for the confirmed platform-collection/post-fulfilment payout model before real-money activation.

## 3. Architecture direction

Keep the existing React/Vite frontend, Express API, PostgreSQL/Drizzle database and monorepo. There is no demonstrated need for a rewrite or microservices.

- Organize the backend into domain modules with request schemas, authorization, business services and database access. Keep HTTP handlers small as workflows grow.
- Extend the shared API contract to real endpoints. Generate or share request/response validation and types instead of maintaining incompatible handwritten shapes.
- Use versioned database migrations. Review the actual deployed schema before introducing migrations or backfills; do not infer production state from the repository alone.
- Use canonical IDs throughout. Store an explicit listing channel such as marketplace or Fotizo shop rather than classifying by seller name.
- Store money in integer minor units with explicit currency and deliberate rounding rules. Store quote and order snapshots; distinguish display conversion from charge currency.
- Maintain a transaction ledger for customer collection, platform fees, seller earnings, refunds, adjustments and payouts. Track pending, held, eligible, in-flight and paid earnings separately. Payout eligibility requires the approved fulfilment evidence and no blocking dispute/refund hold; a seller marking an order shipped must not alone authorize payment release.
- Keep payment, order, fulfilment, booking and payout states separate. Model legal transitions rather than using one generic status field for every concern.
- Use durable jobs and an outbox for payment follow-up, emails, reservation expiry and reconciliation. External side effects must survive retries and process restarts.
- Store uploaded media in controlled object storage, with ownership, type/size limits and generated display variants.
- Keep the same-origin frontend API approach and align session/CSRF settings with it.
- Separate local/test/staging/production configuration. Production must reject prohibited mock flags and expose no demo identity bypass.
- Treat dashboards as views of persisted domain data. Add pagination and indexes according to real query patterns.

## 4. Delivery sequence and release gates

### Phase 0 — Scope, baseline and acceptance map

Deliverables:

- Record the decisions above and a feature inventory mapped to the 42 review findings.
- Inspect the live schema and deployment configuration read-only when access is available.
- Document local startup, environment variables, supported runtime/package-manager versions and safe test data.
- Establish staging with sandbox credentials and isolated storage/database resources.
- Define a permission matrix and acceptance scenarios for every role.
- Create a tracked backlog with states: planned, implementing, verified, released and blocked with reason.

Gate: another developer can run the project from documented instructions, and the intended behavior of each product area is explicit. Outstanding business decisions have named dependencies rather than hidden assumptions.

### Phase 1 — Authentication, privacy and engineering foundation

Frontend:

- Add session-loading state and role-aware private route guards.
- Scope private query keys to identity; clear conversations, cached private records and account-specific cart state on account changes.
- Cancel stale requests so late responses cannot restore a previous account's state.
- Make logout await server confirmation and display actionable failures.
- Standardize loading, errors, retry, empty states and accessible form controls.
- Disable misleading success flows until their backend paths are implemented.

Backend and infrastructure:

- Validate JWT purpose/claims and implement session revocation or session version checks.
- Add CSRF protection, appropriate cookie policy and authentication abuse limits.
- Implement recovery, password changes, email verification and account suspension with deliberate Google-account behavior.
- Add consistent JSON errors, structured audit events, readiness checks and graceful shutdown.
- Introduce migration discipline, API contract checks and CI for typechecking, relevant tests and builds.
- Define secret handling and explicit production configuration validation.

Gate: account A cannot see account B's data, including after logout/login and delayed requests; suspended/revoked access is rejected; private routes wait for session restoration; recovery and logout are tested.

### Phase 2 — Real catalogue, media and seller ownership

Frontend:

- Connect shop and marketplace to real published inventory with canonical IDs.
- Implement owner views for draft/unpublished products, editing, publishing, unpublishing and stock updates.
- Implement service owner lists, editing and withdrawal.
- Use real stock/availability in product cards and cart controls.
- Add search/filter/sort/pagination and trustworthy result counts.

Backend:

- Add explicit listing channel, ownership and publication/approval rules.
- Define product variants if required; otherwise explicitly constrain the initial catalogue to one SKU per listing.
- Add validated media upload and removal, plus cleanup of abandoned uploads.
- Complete optional AI listing assistance with verified provider configuration, per-user quotas, validated responses, failure handling and seller review before publication. Listing creation must remain usable when AI is unavailable.
- Normalize money/range/quantity validation and category contracts.
- Add owner-authorized detail endpoints and concurrency protection for inventory changes.
- Plan and rehearse imports/backfills; preserve references and audit stock adjustments.

Gate: a permitted seller or representative creates a listing, publishes it, sees it in the correct storefront, updates it and withdraws it; another seller cannot access private drafts or modify it. No static product is presented as purchasable inventory.

### Phase 3 — Complete commerce and fulfilment

Frontend journey:

1. Add a real product to a persistent cart with a defined guest/account merge policy.
2. Enter and validate delivery/contact details for supported destinations.
3. Retrieve an authoritative server quote showing stock, currency, shipping, fees/taxes and expiry.
4. Confirm a revised quote when availability or price changes.
5. Pay through the chosen provider's supported secure flow.
6. View the real order reference, payment state and fulfilment details.
7. Track delivery, request cancellation/return/refund, and receive status notifications.

Backend:

- Persist quote, address/contact snapshots, orders, seller-specific fulfilments and payment attempts.
- Implement inventory reservations, expiry/release and concurrency-safe commitment.
- Use idempotency for order placement and payment attempts.
- Verify webhook signatures; deduplicate events and handle delayed or out-of-order delivery.
- Treat provider confirmation as authoritative for payment; do not trust a browser redirect.
- Implement partial/full cancellation and refund rules, restocking, tracking updates and delivery confirmation.
- Add durable notifications, payment reconciliation and the approved seller settlement/fee ledger.
- Provide staff tools for payment exceptions, stuck orders, refund review and fulfilment corrections with audit trails.

Gate: sandbox payment success, failure, abandonment, duplicate submission, response loss, repeated webhook, out-of-order webhook, last-item contention, cancellation and refund all produce consistent stock, order and financial records. Mixed-seller orders reach the correct fulfilment queues. No payout releases before eligibility; partial refunds, dispute holds, duplicate payout requests and provider payout failures reconcile correctly. Market configuration cannot enable an unsupported payment/delivery combination.

### Phase 4 — Services, bookings and negotiated offers

- Define provider availability, duration, timezone and booking approval rules.
- Persist bookings against a service and package with price and scope snapshots.
- Prevent overlapping bookings using transaction-safe constraints/locking appropriate to the availability model.
- Implement confirmation, rescheduling, cancellation, reminders, completion and dispute handling.
- Apply the approved booking payment/deposit/refund policy using the payment foundation.
- Make accepted negotiated offers create or link to an explicit purchasable order/booking; acceptance alone must not imply payment.
- Add provider calendar/work queues and buyer booking history; make meeting/location details functional and permission-scoped.

Gate: a buyer books, the provider receives the work, both see matching details after reload, timezone handling is correct and concurrent attempts cannot double-book the same capacity.

### Phase 5 — Messaging, reviews and customer support

- Make conversation creation unique for the defined participants/context and make offer responses atomic.
- Add paginated thread history, incremental updates, reliable read receipts and send/retry state with retained drafts.
- Stop anonymous polling and clear all private state on session changes. Choose polling or realtime transport based on required behavior and measured load.
- Implement actual wishlists and authenticated profile/preferences persistence.
- Limit reviews to eligible completed purchases/bookings; implement rating aggregates and moderation.
- Persist support cases linked to orders/bookings/vehicles where relevant; add assignment, replies, attachments, status history and escalation.
- Implement notification preferences and a real notification centre; connect email delivery and retries.
- Connect newsletter opt-in and unsubscribe if newsletter remains in scope.

Gate: a customer creates a support case, staff respond, the customer receives and can follow the response; conversation failures are recoverable; wishlist/reviews survive new sessions and obey ownership/eligibility rules.

### Phase 6 — Vehicles, sourcing and representative operations

- Implement maintained vehicle inventory/specifications, availability and ownership of leads.
- Persist enquiries, destination requirements, staff assignment, quotations, customer acceptance and stage history.
- Define vehicle price estimates versus binding quotes clearly, including approved freight/duty assumptions and quote expiry.
- Implement the approved sourcing process: suppliers, purchase orders, stock receipts, inspections, shipment/container tracking and handover.
- Implement any deposits/invoices through the agreed financial model; do not imply online vehicle checkout unless explicitly intended.
- Replace representative sample charts, shipments and supplier records with real operational data.
- Make imports repeatable and reviewable, with validation and provenance rather than silent overwrites.

Gate: a vehicle enquiry can be followed from customer submission through staff quotation and the agreed fulfilment stages. A shop replenishment can be traced from supplier order to received/publishable stock.

### Phase 7 — Administration, finance and complete role dashboards

Minimal staff tooling needed by earlier phases is built with those phases. This phase completes the wider operational system.

- Enforce the final role/permission matrix on every staff endpoint and screen.
- Implement user/seller/provider verification and suspension, listing/review moderation, disputes and support oversight.
- Derive financial and operational metrics from real records; define each metric's meaning and timezone.
- Implement authorized exports, filtered search, audit history and pagination.
- Implement seller earnings, fees, refunds, settlement/payout state and reconciliation for the selected money flow.
- Define the developer role explicitly: operational status and permitted diagnostics, without exposing secrets or creating an unrestricted admin bypass.
- Resolve the existing developer portal's API Keys, Usage & Logs, Webhooks and Endpoints screens as real features: scoped/revocable API credentials stored securely, quotas, redacted usage logs, endpoint documentation, signed outbound events, delivery history and controlled retries. Confirm intended API consumers before exposing external API access.
- Add secure staff provisioning and stronger authentication appropriate to privileged actions.

Gate: each role can perform its agreed duties and cannot perform other roles' restricted duties. Metrics reconcile to source records; sensitive changes identify who did what and when.

### Phase 8 — Production readiness and controlled release

- Run the full cross-role end-to-end acceptance suite on staging with production-like settings.
- Exercise database migrations, backups/restores and rollback/roll-forward procedures on safe data.
- Test realistic catalogue sizes, message histories, concurrent checkout and background job recovery.
- Complete mobile, keyboard, screen-reader, browser and failure-state checks.
- Review dependency/security findings, secret exposure and authorization boundaries.
- Verify monitoring, alert delivery, job failure queues and operational ownership.
- Align terms/privacy/trust/help content with the implemented product and approved business policies; arrange required specialist review separately.
- Verify public metadata, canonical URLs, crawl behavior and product-page search requirements; assess prerendering only if needed.
- Verify home/category/search content, guides and testimonials use approved maintainable sources; remove unsupported marketing counts and ensure all navigation, policy and help links work.
- Remove or clearly disable every unfinished production action, fixture-derived metric and mock integration.
- Perform an approved production deployment and controlled pilot, with observable rollout gates and a recovery path.

Gate: all required feature acceptance criteria pass, no unresolved release blockers remain, and staff can recover from a failed payment, delayed shipment, support issue or service outage. Production activation and real-money actions remain explicit release decisions.

## 5. Domain/data inventory

This is a planning inventory, not a directive to create every table immediately. Final schema follows the confirmed rules and uses migrations per phase.

| Domain | Records and concerns |
| --- | --- |
| Identity | Accounts, sessions/revocation, verification/reset tokens, roles/permissions, profiles, addresses |
| Catalogue | Products/SKUs, service packages, channels, categories, media, publication/moderation |
| Inventory | Stock balances, reservations, adjustments, supplier receipts |
| Commerce | Carts, quotes, orders/items, delivery snapshots, fulfilments, tracking, returns |
| Payments | Attempts, provider events, refunds, financial ledger, commissions, settlements/payouts as applicable |
| Services | Availability, bookings, schedule changes, completion and cancellation history |
| Messaging | Context-linked conversations, participants, messages, read state, offers and accepted-offer links |
| Customer care | Support cases, assignments, replies, disputes, attachments |
| Engagement | Wishlists, eligible reviews, notification preferences/delivery, newsletter subscriptions if retained |
| Vehicles/sourcing | Vehicles, leads, quotations, suppliers, procurement, inspections, shipments and handover |
| Operations | Audit events, outbox/jobs, integration failures and reconciliation runs |

## 6. How we will work together

Work in bounded vertical slices. Each slice should describe the user outcome, permissions, data changes, failure cases and acceptance evidence before implementation begins.

For each slice:

1. Select the next unblocked outcome and relate it to review findings.
2. Confirm only unresolved business choices that affect that outcome.
3. Add a reviewed migration and API contract where required.
4. Implement backend behavior and connect the frontend in the same slice.
5. Verify the actual journey and important failure/concurrency/security cases.
6. Report what works, what changed, what was tested and remaining limitations; update the backlog and this plan.

Routine implementation and reversible local work should proceed without repeated permission requests. Decisions about money flow, business policy, production access, destructive migrations or release activation need explicit resolution when relevant.

Keep changes reviewable. Avoid broad cosmetic rewrites while foundational correctness remains unresolved. A failed check must be explained and resolved or recorded as a blocker; a mock must never be used to make a failing integration look complete.

## 7. First implementation batch

The first batch can proceed independently of payment-provider selection:

- Establish the shared session lifecycle and user-scoped private state.
- Fix dashboard session restoration and role guards.
- Clear/cancel message and query data on account changes; handle logout failure.
- Validate token purpose and claims; introduce the chosen revocation mechanism.
- Add CSRF controls and authentication throttling with focused integration tests.
- Add initial CI/build checks and documented local setup.
- Identify and visibly disable false booking/payment confirmations while those workflows are built.

Acceptance evidence: automated two-account isolation checks, delayed-response/logout tests, role-boundary tests, invalid/pending-token rejection, CSRF rejection and successful session restoration on refresh. The next batch then tackles real catalogue ownership and purchasable inventory IDs.
