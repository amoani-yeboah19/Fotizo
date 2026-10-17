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

Additional profile fields are explicitly **browser drafts**, not account updates. They are stored after successful registration under `fotizo_profile_draft_v1:<userId>` and can be edited or cleared from Settings. Storage is account-scoped, schema-validated on reading, and failures are reported without pretending to save. No passwords, auth tokens, identity documents or payment details are included. Drafts survive logout on that browser; users can remove them with **Clear draft**. They do not constitute identity verification, provider approval or proof of policy consent.

### Backend handoff — required before production rollout of extended profiles

1. Agree a versioned profile contract and migration for country, city, communication language, individual/business type and business name. Buyer fields: intended use. Provider fields: headline, introduction, skills array, experience, service-delivery mode and optional HTTPS portfolio. Distinguish public professional fields from private account/preferences fields. Country is currently free text; use a shared country-code catalogue when finalising the API.
2. Add authenticated read/update endpoints with ownership checks, input limits, role-specific validation and safe public serialization. The existing `PATCH /auth/profile` only accepts `name`; do not send these fields to it until the API is extended. Replace the browser draft adapter with server persistence and offer an explicit import of a valid draft after sign-in.
3. Persist onboarding completion and policy versions/acceptance time for both email and Google registration. Validate these server-side; a client checkbox or browser draft is not an audit record. Define whether registration/profile creation is atomic and the retry/resume behaviour for partial failures.
4. Implement email verification/resend and email-change confirmation, password recovery and provider verification/approval as separate flows. Never infer verified status from profile completeness. Photo/portfolio uploads need validated file handling and storage before enabling uploads here.
5. Add notification preferences and enforce them in delivery, plus session/device management and MFA if required. Add billing/payout details through the chosen payment provider; do not store raw payment credentials in profile drafts.
6. Add audited account deactivation/deletion and data export workflows with reauthentication, ownership checks and appropriate retention rules. Current UI directs these requests to Support.

Frontend validation: settings save/failure paths, role-specific profile requirements, account isolation, corrupted/blocked browser storage, password confirmation, email payload compatibility and Google onboarding are covered by component tests. A hosted mobile/keyboard review and end-to-end tests against the new profile APIs remain release checks after backend integration.
