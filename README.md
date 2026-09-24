# Fotizo

React/Vite frontend, Express API and PostgreSQL/Drizzle workspace. The current completion roadmap is in COMPLETION_PLAN.md; IMPLEMENTATION_STATUS.md records verified work and remaining gates.

## Runtime and installation

Use Node 24 and pnpm 11.3.0 (pinned in package.json). Run `pnpm install --frozen-lockfile`. On Windows use `pnpm.cmd` if PowerShell blocks the script shim. No POSIX shell is required.

The pnpm 11 build allowlist preserves the existing approvals for bcrypt/esbuild and other listed native tools. See [the upstream migration notes](https://github.com/pnpm/pnpm.io/blob/main/blog/releases/11.0.md). Do not disable the package release-age policy to work around an installation error.

## Local development

1. Copy artifacts/api-server/.env.example to artifacts/api-server/.env. Supply a local database URL and a random JWT secret. Keep real credentials out of git.
2. For a brand-new disposable local database only, create the current schema with `pnpm --filter @workspace/db push`, supplying DATABASE_URL in that terminal. Do not use schema push against an existing production database.
3. For an existing database, run the additive migrations described below before starting this server version.
4. Copy artifacts/fotizo/.env.example to artifacts/fotizo/.env.local and set both VITE_USE_MOCKS=false and VITE_USE_MOCK_SHOP=false to exercise real APIs. Some later-phase endpoints remain unfinished; see the status document. Demo data is for demonstrations only.
5. Run `pnpm --filter @workspace/api-server dev` and `pnpm --filter @workspace/fotizo dev` in separate terminals. The frontend listens on localhost:5173 and proxies /api to 127.0.0.1:5000. Set API_PROXY_TARGET to override the target.

The API's dev command loads .env from its package directory. For database tools, set DATABASE_URL explicitly in the shell. Use a separate test/staging database; do not point local seed/push commands at production.

## Validation

- `pnpm typecheck`: all TypeScript projects.
- `pnpm test`: React session/state tests and HTTP API tests backed by isolated PGlite (the PostgreSQL engine in WASM). No external database or real provider credentials are used.
- `pnpm build`: typechecking plus all package builds.
- `pnpm check`: the full validation pipeline.

GitHub CI runs the full pipeline; Vercel's configured build runs typechecking and tests before building the frontend. Test success does not establish that external payment, email, Google or hosting integrations are configured.

## Existing database migrations

From the repository root, with artifacts/api-server/.env containing the intended connection:

```
node --env-file=artifacts/api-server/.env lib/db/migrate.mjs
```

The runner locks concurrent migrations, checks previously applied SQL checksums, and applies pending files in a transaction. Migration 0001 requires the existing users table and adds session/rate-limit storage and suspension state. Migration 0002 adds explicit marketplace/shop channels, classifies existing China representative listings as shop inventory, and adds catalogue indexes and a channel constraint. Migration 0003 adds versioned account status and manager audit records. All three migrations tolerate already-created objects for local schema adoption. They are not a full baseline for an empty database. A reviewed baseline/adoption process is still needed before broad production schema changes.

Deployment order: verify the target and backup/restore procedure, apply all three additive migrations, then deploy the API and frontend together. The new session token format intentionally requires existing users to sign in again. The API must never start with an unmigrated schema. No live migration is run by application startup or the test suite.

## Session and deployment configuration

- JWT_SECRET: random secret of at least 32 bytes in production; never a frontend VITE variable.
- CORS_ORIGIN: exact frontend origins separated by commas; required in production. Include the real frontend origin, without a trailing slash or wildcard.
- TRUST_PROXY_HOPS: default 0. Configure only after verifying the actual trusted proxy topology and stripping untrusted forwarding headers. Wrong configuration can group customers into one rate limit or trust spoofed client addresses.
- Cookies are HttpOnly, Secure in production, and SameSite=Lax. Use the same-origin Vercel /api proxy; direct cross-site cookie deployments are not supported by this configuration.
- Every API write sends X-Fotizo-Request: 1. Browser origins must match the allowlist. Future provider webhooks need separate signature-verified routes; do not exempt them casually from authentication/origin protections.
- Logout deletes the current server session before reporting success. Authorization resolves the current database role and rejects suspended accounts. Managers can suspend/reactivate buyer and seller accounts through the audited account controls.
- Authentication attempts are limited by a shared PostgreSQL counter, 30 per client IP per 15-minute window. Verify proxy configuration before rollout. Production monitoring and further abuse controls remain roadmap work.

Release builds reject enabled mock flags or a demo identity picker. Use an explicit demo build mode only for separately identified demonstrations. Hosting environment overrides are included in this check.

## Account settings

Signed-in users can open /settings from the account menu to update their display name or change an existing password. Password changes require the current password and revoke all account sessions in the same transaction. Google-only users manage their password with Google. Email changes and recovery/verification delivery remain unavailable pending that workflow. Account changes are disabled in demo mode.

Same-origin tabs clear private data and recheck their session after another tab signs in, signs out or changes a password. This uses browser storage events containing only a nonce; browser storage restrictions can prevent the notification, while server session revocation continues to apply. See artifacts/fotizo/src/features/settings/README.md for API behavior and test coverage.

## Current catalogue and currency behavior

Production shop pages read published API inventory. An empty shop is expected until reviewed inventory is published; fixture data is not a production fallback. Product channel is assigned by the server, and owners can edit or republish their unpublished listings. Product prices currently use GBP as the base; this is not a decision to launch the UK market first. Currency selection stays on GBP if valid rates are unavailable. Market-specific charge currencies and money storage remain completion-plan work.

## Current transaction availability

Checkout and online booking are intentionally unavailable until verified payments and real scheduling exist. POST /api/orders returns 503 without changing stock. The frontend never asks for card details or invents booking/order confirmations. Existing order history remains readable.

## Manager account controls

Active managers can use the Users and Account audit dashboard sections to review, suspend and reactivate buyer/seller accounts. Staff accounts, self-suspension and role changes are protected. Every transition requires a reason and the current status version; state changes, session revocation and the audit record commit together. Demo mode disables these controls. See artifacts/fotizo/src/features/profile/ACCOUNT_CONTROLS.md for permissions, API behavior and limits.

## API health and shutdown

- `GET /api/healthz` is process liveness and stays 200 while the process can answer, independently of database availability.
- `GET /api/readyz` returns 200 with `{ "status": "ready" }` after checking database access and the session, catalogue and account-audit schema required by migrations 0001/0002/0003. It returns 503 with `{ "status": "not_ready" }` during draining or failure, without database details. Responses are not cached. Concurrent probes share one check.
- Database connection acquisition is limited to five seconds. Readiness queries have a two-second client timeout; configure the hosting probe timeout above seven seconds to allow both stages. This probe does not inspect every schema constraint, external provider, or business workflow.
- Startup validates the TCP port and runs the database/schema check before opening the listener. Missing migrations or unavailable database access make startup fail, so apply migrations first and use the host's restart policy.
- SIGTERM/SIGINT mark the API unready, stop accepting connections, let active HTTP requests finish, then close the database pool. Shutdown has a ten-second deadline; expiry closes remaining HTTP connections and exits unsuccessfully. The host's termination grace period must exceed ten seconds. Forced termination can interrupt a request after its database commit, so business-write idempotency remains necessary.

## Operational limits

Recovery/email verification delivery, audit workflows, complete business APIs and external integrations are still in progress. Do not treat a successful build as authorization to activate real-money transactions. Production deployment, database inspection and provider verification have not been performed as part of this local implementation batch.
