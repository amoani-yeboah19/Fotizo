# Account settings

`/settings` is an authenticated route available to every signed-in role through desktop and mobile account navigation.

- Profile: updates the display name through `PATCH /api/auth/profile` with `{ name }`. The API trims and validates 1-120 characters, rejects additional fields, and returns the public user. Email, role, verification state and account ID cannot be changed through this endpoint. Saving does not clear the active cart.
- Password: `POST /api/auth/password` accepts `{ currentPassword, newPassword }`. A new password must have at least 8 characters and at most 72 UTF-8 bytes; the current password must match, and reuse is rejected. Google-only accounts cannot set a local password through this flow.
- Success atomically replaces the password hash and revokes every account session, clears the current cookie and returns 204. The frontend clears private state and returns to login. Session issuance checks credentials under the same account lock to prevent a previously verified old password from creating a new session afterward.
- Errors: 400 invalid input/current password, 401 missing or revoked session, 409 Google-only account or concurrent credential change, 429 throttled, 503 temporary failure. Password-change attempts share the authentication IP limit and have an additional five-attempt account limit per 15-minute fixed window.
- Password inputs are cleared after submission completes. A lost/ambiguous response hides private state and offers a session recheck instead of assuming the password was unchanged.
- Same-origin tabs exchange a nonce through storage events after session changes. Receiving tabs clear private data before checking the server session; an in-flight mutation cannot restore the old identity. When browser storage is disabled, these notifications are unavailable, but API revocation still applies.
- Demo mode explicitly disables account changes. No plaintext passwords are written to browser storage or logs by this feature.

Profile/security HTTP tests use isolated PGlite with real Express requests. React tests cover form validation, server errors, identity preservation, private-state clearing and cross-tab event handling. Full browser, mobile/keyboard, and hosted PostgreSQL concurrency checks remain staging acceptance tasks.

Email changes, profile photos, password recovery, verification delivery and staff account controls remain separate completion-plan work. No new migration is needed for this batch; the previously added sessions migration remains required.

## Frontend account and onboarding update

Settings now has responsive section navigation for account information, personal/professional details, password/security and display currency. Display currency uses the existing currency provider; name/password use the existing auth endpoints. Support/privacy links are real routes. No verification status, MFA, notification delivery or account deletion is simulated.

Email signup now has two steps: account credentials and a role-specific profile. Google signup uses the same profile fields after role selection. Confirmation, profile validation and explicit terms acknowledgement run before account creation. Only the existing supported fields are sent to registration; API contracts and backend files are unchanged.

## Account profiles (server-backed)

Profile details are stored on the account (migration 0011), not in the browser.

- **Contract v1** (`GET`/`PUT /api/account/profile`): country (2-80 characters, free text for now), city, communication language, account type (`individual`/`business`) and business name. Buyers add an intended use; professionals (`seller` role) add a headline (10-80), introduction (80-1200), 1-10 distinct skills (up to 60 characters each), experience, service-delivery mode and an optional HTTPS portfolio URL. Choice fields travel as stable codes (`purpose`: shopping, hiring, business_buying, shopping_and_hiring; `experience`: under_1, 1_3, 3_5, 5_10, over_10; `workMode`: on_site, remote, on_site_and_remote, product_sales); the form maps them to its labels. Validation uses the role stored on the account, never a client claim, and fields that don't apply to the role are not stored.
- **Concurrency:** `PUT` sends `expectedVersion` (0 when no profile exists yet). A stale version returns 409; Settings explains and offers **Load latest version** instead of overwriting edits made in another tab or device.
- **Public vs private:** `GET /api/profiles/:userId` returns only the professional fields (headline, introduction, skills, experience, service delivery, portfolio) plus name, avatar, join date and verification flag, for active professional accounts with a profile. Location, language, account type, business name, intended use and email stay private.
- **Signup:** email registration and Google sign-up completion require `acceptedTerms: true` and send the onboarding profile. The account, its Terms/Privacy acceptance (the server records the current versions, `2026-08-15`, with a timestamp) and the profile are created in one transaction: an invalid profile creates nothing, so a failed signup can be retried. `onboardingCompleted` on the user is set by the first complete profile save. Accounts created before this change have no profile; Settings lets them add one.
- **Earlier browser drafts:** if a valid draft saved by the previous version exists for the signed-in account and the account has no profile yet, Settings offers **Use saved details**. Nothing is imported until the owner asks, and the draft is removed once saved to the account. Demo builds keep profiles in the browser.

Still separate work: email verification and change confirmation, password recovery, provider verification/approval, photo and portfolio uploads, notification preferences, session/device management and MFA, payout details, and audited account deletion/data export. A verified flag is never inferred from profile completeness. When policies change, bump `CURRENT_POLICY_VERSIONS` in `artifacts/api-server/src/lib/profile.ts` with the pages' `LAST_UPDATED`; re-acceptance of changed policies by existing accounts is not implemented yet.
