# Manager account controls

## Initial permission boundary

Only an active manager with a live session can list buyer/seller accounts, read account audit history, or change buyer/seller access. Developer and representative roles are not managers. Staff accounts and self-suspension are protected; there is no role-granting or staff-account-editing endpoint. These narrow permissions do not settle the broader staff permission policy in the completion plan.

Suspension blocks sign-in and authenticated operations. It does not withdraw published listings, cancel orders or bookings, decide refunds, or change payout eligibility; those business workflows still need their own policies. Existing records remain intact. Reactivation requires a new sign-in and never restores previously issued sessions.

## Interface and API

The manager dashboard now uses real counts, account records and audit history. Search covers customer display names and email addresses, treats LIKE wildcards literally, and supports active/suspended filters. Pages contain at most 25 entries, ordered by creation time and ID; offset paging can shift when accounts are concurrently added, so actions always carry a separate status version.

The Users section requires selecting an account, entering a 10-1000 character reason, and explicitly confirming suspension/reactivation. Cancellation sends nothing. No change is shown as successful until acknowledged by the server. Conflicts clear the stale selection and refresh records; an uncertain result directs the manager to refresh and inspect audit history before retrying.

- GET /api/admin/accounts: page (0-based), q and status filters.
- GET /api/admin/accounts/summary: persisted buyer/seller totals, active and suspended counts.
- POST /api/admin/accounts/:id/status: action (suspend/reactivate), reason, expectedVersion.
- GET /api/admin/account-audit: page and optional targetId.

All endpoints require a manager session and return no-store responses after authentication. Mutations require the existing browser-write header/origin validation. OpenAPI documents these contracts; the frontend consumes generated types. The server extends generated request validation to enforce trimmed reasons, integers, and rejection of unknown fields.

The transaction locks actor/target accounts in canonical order, rechecks manager role/session, verifies the expected status version, updates account state, revokes every target session and inserts the audit event. Failure rolls back all three effects. Repeated/stale requests return 409 and do not add duplicate history, including after a suspend/reactivate cycle. Session issuance checks the status version to reject a stale pre-suspension login attempt.

Audit entries retain actor/target IDs, action, reason, before/after suspension timestamps, version and creation time. Names are joined from current profiles. The application only appends audit entries; there are no update/delete endpoints. This is not tamper-proof storage against a database owner. Dedicated production database permissions, audit export/retention and wider administrative audit events remain operational work. Reasons are displayed as plain text.

Demo mode disables account management. Sample signups, revenue charts and moderation actions have been removed from the manager screen; unfinished content moderation and operational reporting are explicitly unavailable.

## Migration and validation

Apply 0003_account_controls.sql after migrations 0001/0002, before deploying this API version. It adds users.account_status_version, the account_audit table and indexes. No live migration or real account suspension was performed during development. Readiness now checks the new column/table as a prerequisite.

HTTP tests cover role restrictions, protected accounts, session revocation, reactivation, stale logins, concurrency, audit rollback, literal search and pagination. UI tests cover reason validation, confirmation/cancellation, pending and error states, stale selections, audit display and demo restrictions. Generated-client tests check the browser-write header and request payload. Full browser/mobile/keyboard acceptance and hosted PostgreSQL migration/concurrency checks remain staging tasks.
