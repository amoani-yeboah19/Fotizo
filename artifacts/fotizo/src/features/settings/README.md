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
