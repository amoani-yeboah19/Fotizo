> **Status (26 September 2026): implemented.** The workspace below is now the only
> manager dashboard (`pages/ManagerDashboard.tsx`) and runs on the real API in
> production. Its services are `manager.service.ts` (overview, users, listings,
> decisions, audit), `approvals.service.ts` and `oversight.service.ts` (orders and
> disputes); demo builds (`VITE_DEMO_MODE=true`) keep the in-memory sample records.
> Production also shows the live Payments, Support requests and Vehicle enquiries
> queues. The earlier account-controls screen was removed; its `/admin/accounts` and
> `/admin/account-audit` endpoints remain in the OpenAPI contract but the frontend no
> longer calls them. Implementation notes are at the end of this file.

# Manager workspace — frontend and backend handoff

The frontend is at `/dashboard/manager`, with `?tab=overview`, `users`,
`moderation`, and `audit`. Implementation lives in
`features/profile/pages/ManagerDashboard.tsx` and
`features/profile/services/admin.service.ts`.

## Current frontend

- Overview cards and review shortcuts.
- User search, role/verification filters, pagination and verification dialogs.
- Product/service review and publication dialogs requiring a reason.
- Audit history with actor, time, reason and before/after values.
- Loading, empty, error and success states; manager-only UI access.

The workspace uses labelled, in-memory demo data by default, including production
builds. Changes reset on reload. `VITE_USE_MOCK_ADMIN` defaults to `true`, independent
of live authentication and catalogue settings. Use the existing demo build's manager
role picker for frontend review without a real manager account.

No backend implementation or database migration is included in this change.
The live manager route always uses the implemented API; `VITE_USE_MOCK_ADMIN` controls only the explicitly selected demo workspace.

## Proposed API contract for backend developers

Paths below are relative to the configured API base (`/api` by default).
TypeScript response shapes are defined in `admin.service.ts`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/admin/overview` | None | `AdminOverview` |
| GET | `/admin/users` | `page`, `search`, optional `role`, `verification=verified/unverified` | `AdminPage<AdminUser>` |
| GET | `/admin/listings` | `page`, `search`, `kind=product/service`, optional `status=active/unpublished` | `AdminPage<AdminListing>` |
| GET | `/admin/audit` | `page` | `AdminPage<AdminAudit>` |
| POST | `/admin/decisions/:id` | `AdminDecision` as JSON | Successful 2xx; errors `{ "error": "message" }` |

Pagination uses 1-based pages with 20 records. Timestamps are ISO strings. Listing
prices are numeric; the current UI displays GBP, matching existing catalogue pages.
Overview counts include all users, new users in the current UTC month, unverified
users, active/unpublished products and services, and orders placed this UTC month.
Orders placed are not payments collected.

User decisions carry `kind: "user"`, the desired `verified` boolean, `expected`
previous boolean and a trimmed reason of 5–1000 characters. Listing decisions carry
`kind: "product" | "service"`, desired `status`, `expected` previous status and reason.

Backend requirements before enabling real actions:

- Authenticate every endpoint and enforce current manager permissions server-side.
  The frontend guard is navigation control, not a security boundary.
- Return only the user fields in the contract; exclude credentials and identity tokens.
- Validate filters, IDs, decision bodies and reasons.
- Persist each change and its audit entry atomically, recording the authenticated
  actor, target, timestamp, reason and previous/new values.
- Reject conflicting decisions with 409; use 401/403 for access failures and 404 for
  missing records. The UI displays backend decision error messages.
- Define approval submission states and moderation holds before treating unpublished
  listings as a formal approval queue. Owners must not be able to clear staff holds.

Unverified accounts and unpublished listings currently represent existing record
states, not submitted approval applications. Identity evidence, appeals, refunds, disputes and finance reports need separate
workflows and API contracts as those screens are developed. Account status and role
controls are described below; session revocation remains a backend responsibility.

## Frontend validation

```sh
pnpm --filter @workspace/fotizo typecheck
pnpm --filter @workspace/fotizo build
```

## User details and account controls

The Users table now opens a details panel with profile, verification, account status,
owned product/service listings and administrative activity. Demo fixtures include an
active seller and suspended buyer so both suspension and reinstatement can be reviewed.
Role changes and status changes require a reason and a confirmation checkbox. Cancelling
does not change the record. Successful changes refresh the list, details and audit trail.
The UI prevents changing the signed-in manager's own role or account status.

Additional proposed contracts (not implemented on the backend):

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/admin/users/:id` | User ID | `AdminUserDetails` — user, owned listings with kind, account audit activity |
| POST | `/admin/users/:id/account` | `AccountChange` — `action=role/status`, desired `value`, `expected` previous value, reason | Successful 2xx; errors `{ "error": "message" }` |

`AdminUser` now includes `status: "active" | "suspended"`. `AdminListing` includes
`ownerId` so account listings are linked by ID rather than display name. Detail
activity should be returned newest first. The initial UI renders all records returned
by this endpoint; pagination should be agreed before connecting large account histories.

Backend developers will need to persist account status, enforce suspension on protected
requests and revoke sessions, validate role assignments, prevent self-lockout and removal
of the last active manager, and atomically record each account change with its audit entry.
They must derive the actor from authentication and reject stale `expected` values with 409.
The frontend does not implement real session revocation or access changes. Demo data resets
on reload. No backend work is required to review these screens now.

## Approval queue frontend

`/dashboard/manager?tab=approvals` now has Pending, Approved and Rejected filters,
search by listing/seller/email, listing-type filtering and pagination. Review dialogs
show submitted images (or an explicit no-image state), description, category, currency,
price, seller verification and version history. Both decisions require a 5–1000 character
reason and confirmation. A rejected submission explains what the seller must correct.
Demo decisions move records between tabs, update counts and add a shared audit entry.

Fixtures include an initial submission, a resubmitted version with its prior rejection,
an approved product and a rejected service. Seller resubmission is represented by versioned
history; the manager cannot submit revisions on the seller's behalf. The seller-side
submission editor is separate future work. All fixtures and new decisions reset on reload.

Approval and publication are distinct. The existing active/unpublished controls are now
labelled **Publication controls** at `?tab=moderation`. Approval does not publish a listing.
The queue's sample listings are independent submission snapshots, not real catalogue links.

Proposed backend contracts, defined in `services/approvals.service.ts`:

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/admin/approvals` | `status=pending/approved/rejected`, optional `kind=product/service`, `search`, `page` | `AdminPage<ListingSubmission>` plus `counts` for all three statuses |
| POST | `/admin/approvals/:id/decision` | `ApprovalDecision`: `expectedVersion`, `outcome=approved/rejected`, `reason` | Successful 2xx; errors `{ "error": "message" }` |

Counts apply the current search/type filters but precede the selected status filter.
Pages contain 20 entries, newest submission first. ListingSubmission includes a stable
submission ID, listing ID, seller summary, price/currency, images, submitted content,
status, version and newest-first submission/decision history. Historical versions should
be immutable. Seller resubmission should increment the version, restore Pending, preserve
prior decisions and capture the seller's revision note. Reject stale versions or decisions
on already-reviewed submissions with 409. Atomically record each decision with the actor
from authentication, reason and audit entry. Define seller notifications and whether a
separate authorized publication step is required before enabling this against real records.
No backend implementation is included or needed to review the demo.

## Hosted demo

The public demo entry path is `/dashboards` (with `/demo` retained as an alias).
The main site's `vercel.json` redirects `https://fotizo.vercel.app/dashboards` to
`https://fotizo-dashboards-demo.vercel.app/dashboards`. Select Manager on the role picker.
This keeps mock sign-in on the separate demo origin; the main frontend uses its normal
production authentication settings.

Build the demo with `pnpm --filter @workspace/fotizo build:demo`. Its static output is
`artifacts/fotizo/dist/demo`; deploy that output to the existing
`fotizo-dashboards-demo` project with the SPA rewrites in `demo.vercel.json`. The main
site uses the normal production build and root Vercel configuration. Both entry paths
must serve index.html so page refreshes and direct dashboard links work.

## Orders and disputes frontend

`/dashboard/manager?tab=orders` provides Orders and Disputes views with reference,
customer/seller search, status filters, pagination, empty/error/loading states and detail
dialogs. Order details show item quantities/prices, delivery charge and total, buyer/seller,
fulfilment and payment states, courier/tracking, delivery exceptions and an event timeline.
Linked disputes show customer/seller statements and decision history. Fixtures include
pending, processing, shipped, delivered and cancelled orders, with a delivery exception,
damage complaint and resolved address-correction case.

Dispute actions require a reason and confirmation: start review, request refund review,
resolve without refund, or reopen a resolved case. Requesting refund review marks the case
Escalated; it does not approve a refund or change the order/payment record. Demo decisions
update the case version and shared audit trail. The order overview fixtures are independent
from the other sample catalogues and live customer order history.

Proposed API contracts in `services/operations.service.ts` (no backend implementation):

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/admin/orders` | `page`, `search`, optional fulfilment `status` | `AdminPage<ManagedOrder>` |
| GET | `/admin/orders/:id` | Order ID | `{ order: ManagedOrder, disputes: ManagedDispute[] }` |
| GET | `/admin/disputes` | `page`, `search`, optional case `status` | `AdminPage<ManagedDispute & { order: ManagedOrder }>` |
| POST | `/admin/disputes/:id/decisions` | `DisputeDecision`: action, expectedVersion, reason | Successful 2xx; errors `{ "error": "message" }` |

Page size is 20; records are newest first. Amounts include a currency code and represent
major currency units. Fulfilment and payment status are separate. These sample orders have
one seller per order; backend integration needs an agreed grouping for multi-seller checkout
and must preserve per-line fulfilment. Case states are Open, Reviewing, Escalated and
Resolved. `CASE_ACTIONS` documents the frontend transitions. Persist and authorize decisions
server-side with optimistic version checks (409 on conflict) and atomic audit records.
Finance must own refund approval/execution, payment reconciliation, approval limits and
protection against duplicate refunds. Real notifications, attachments, staff assignment,
returns and shipment investigation need separate backend contracts. These frontend controls
send no customer messages and make no financial transactions in demo mode.

## Backend implementation (migration 0012)

All endpoints above exist under `/api/admin` and require an active manager; the
acting manager is re-read and locked inside every decision, so a manager demoted or
suspended a moment earlier cannot finish one. Decisions check the expected previous
value or version (409 when stale), validate a trimmed 5-1000 character reason and are
saved in the same transaction as an `admin_audit` record (actor from the session,
action, target, reason, before/after). `admin_audit` is append-only (a trigger rejects
updates and deletes) and includes the earlier suspension history.

- **Accounts:** managers cannot change their own role or status; suspending revokes
  every session; role changes apply on the next request; removing the last active
  manager is refused. Staff accounts can now be suspended by another manager.
- **Publication:** staff unpublishing sets a moderation hold the owner cannot clear
  (seller republish returns 409); staff publishing lifts it.
- **Approvals:** reviewed after publication. New and content-edited seller listings
  (products and services from `seller` accounts; Fotizo shop stock is exempt) join the
  queue; each change is a new version with its snapshot kept in the history. Rejecting
  unpublishes the listing with a hold and returns the reason to the seller (seller
  dashboard and My services); approving lifts the hold but leaves republishing to the
  seller. Stock-only edits don't need review.
- **Orders:** one record per checkout; state is rolled up from the lines (the least
  advanced open line); multiple sellers are listed together. Carrier and delivery
  exceptions are not recorded yet, so those fields are null.
- **Disputes:** buyers report a problem from the purchase details popup
  (`POST /api/orders/:id/disputes`, one unresolved dispute per order); their report is
  the first statement. Requesting refund review only escalates the case. Notifications,
  seller statements, attachments, assignment and refunds are not implemented.
