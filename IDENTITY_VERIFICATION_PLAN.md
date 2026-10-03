# Seller identity verification with Veriff — plan

Status: **built** with the recommendations in §2 (migration 0017). Dormant until Veriff keys are added on Render, and not enforced until `IDENTITY_REQUIRED_FROM` is set — see §7.

## 1. Where we are today

- **One `users.verified` flag means two different things.** Google sign-in sets it (Google confirmed the email), and managers set or revoke it by hand in the manager workspace (audited). Public professional pages show it as **"Verified by Fotizo"**, so anyone who signs in with Google gets that badge without any identity check. That must be split before an ID badge means anything.
- **Sellers and artisans share the `seller` role.** Product sellers and service providers both sign up as `seller`. Staff roles (manager, representatives) are set server-side and are out of scope.
- **Listings go live immediately.** New and edited seller listings are published and queued for after-the-fact review (`submitForReview` in `lib/admin.ts`). Nothing currently checks who the seller is.
- **There are no payouts yet.** Sellers' earnings and fees are recorded (`platform_fees`, `/earnings`), but money is not paid out through Fotizo. That will be the strongest reason to require identity.
- **Existing patterns to reuse.** Payments already use signed provider webhooks mounted before the JSON parser (`app.ts`), idempotent event handling, a return-page "verify with the provider" fallback, and an `admin_audit` trail. Veriff fits the same shape.

## 2. Decisions needed (recommendations first)

1. **Who must verify:** every `seller` account, covering both product sellers and artisans. *(Recommended.)* Buyers never need to. Fotizo staff accounts are exempt.
2. **What verification unlocks:**
   - **(Recommended)** Sellers can sign up and prepare listings, but listings stay hidden from the public until the identity check is approved.
   - Alternatives:
     - **Looser:** listings go live, but verification is required before the first sale or payout.
     - **Stricter:** sellers can't create listings at all until verified.
3. **Existing sellers:** a 14-day grace period with dashboard and email reminders. After that, unverified sellers' listings are hidden (not deleted) until they verify.
4. **Retries and cost:** Veriff charges per verification, so there's a cost per attempt.
   - Allow a new attempt only when Veriff asks for resubmission, or when a session expired or was abandoned.
   - Limit each seller to 3 sessions per 30 days.
   - A declined result goes to a manager for appeal rather than an automatic retry.
5. **Name matching:** compare the verified name with the account name. A mismatch goes to manager review, not automatic rejection, because nicknames and business names are common.
6. **Businesses:** individuals only for now. Veriff's business verification (KYB) can come later, alongside payouts.

## 3. How it works

```
Seller dashboard ──"Verify identity"──► POST /api/identity/session ──► Veriff POST /v1/sessions
       ▲                                         │ (vendorData = our verification row id)
       │                         session url ◄───┘
       │   Veriff InContext SDK (modal) or redirect to the session url
       │
       └── GET /api/identity  ◄── status ── identity_verifications ◄── Veriff decision webhook
                                                                   (POST /api/identity/webhooks/veriff,
                                                                    HMAC-checked, idempotent)
```

1. **Start a check:** the seller clicks **Verify your identity** and the API creates a Veriff session. Only opaque IDs are sent: `vendorData` = our verification row ID, `endUserId` = the user ID. No name, email or document details are sent ahead of time. The browser opens the session URL with Veriff's InContext SDK (`@veriff/incontext-sdk`, `createVeriffFrame`), so the seller stays on Fotizo.
2. **Seller finishes:** the SDK's `FINISHED` event switches the dashboard to "We're checking your documents". The result does not come from the browser.
3. **Decision webhook:** Veriff posts the decision to our webhook. We:
   - check `x-hmac-signature` (HMAC-SHA256 of the raw body with the shared secret, compared in constant time) and that `x-auth-client` is our key;
   - return 200 within 5 seconds;
   - process the decision idempotently. Veriff delivers at least once, possibly out of order, and retries for up to a week.
4. **Fallback:** if the webhook hasn't arrived when the seller returns, the API can ask Veriff directly with `GET /v1/sessions/{id}/decision` (signed with the session ID). This is the same pattern as payment verification.
5. **Result:**
   - `approved`: the account becomes identity-verified, its hidden listings go live, and the public "ID verified" badge appears.
   - `resubmission_requested`, `expired` or `abandoned`: the seller is invited to try again.
   - `declined`: goes to a manager with Veriff's reason.
   - `review`: waits until Veriff finishes reviewing.

## 4. Data model (migration 0017)

**`identity_verifications`** — one row per Veriff session:
- `id` (uuid; sent to Veriff as `vendorData`), `user_id`, `provider` ('veriff'), `session_id` (unique)
- `status`: created | started | submitted | approved | declined | resubmission_requested | expired | abandoned | review
- `decision_code`, `reason`, `reason_code`
- `document_type`, `document_country`
- `name_matches` (boolean)
- `created_at`, `submitted_at`, `decided_at`

**`identity_webhook_events`** — `(provider, session_id, action, received_at)` with a unique key for idempotency. No payload containing personal data is stored.

**`users`**
- New: `identity_status` (none | pending | approved | declined | resubmission_requested) and `identity_verified_at`.
- Change: `verified` becomes manager verification only. Google sign-in should set a separate `email_verified` instead.
- Change: the public badge reads `identity_verified_at` (plus manager verification, if we keep it).

**What we store:** only the decision, the document type and country, and whether the name matched. We do **not** store ID images, document numbers, dates of birth or addresses; those stay with Veriff, and managers open the session in Veriff's portal when they need detail.

## 5. API

| Endpoint | Who | Purpose |
|---|---|---|
| `POST /api/identity/session` | seller | Reuse an open session or create one (rate-limited); returns the session URL |
| `GET /api/identity` | seller | Current status, reason and whether a retry is allowed |
| `POST /api/identity/refresh` | seller | Fallback: ask Veriff for the decision |
| `POST /api/identity/webhooks/veriff` | Veriff | Decision (and optional event) webhook; raw body; mounted before `protectBrowserWrites` like the payment webhooks |
| `GET /api/admin/users?identity=review` | manager | Find declined, mismatched and review cases (users filter) |
| `POST /api/admin/decisions/:userId` with `kind: "identity"` | manager | Approve, decline or revoke with a reason; checks the expected status and writes `admin_audit` |

**Enforcement** (from `IDENTITY_REQUIRED_FROM`):
- Public product and service queries also require the owner to be identity-approved (or exempt staff).
- Listing creation still works, but the response says the listing is hidden until verification.

## 6. Frontend

- **Seller dashboard:** a verification card covering not started, in progress, approved, resubmission needed and declined, with the Veriff modal. Uses the same card style as Earnings.
- **New-listing and edit forms:** a short note when the listing will stay hidden until verification.
- **Public seller and artisan pages:** an "ID verified" badge driven by the new field, replacing the current Google-based one.
- **Manager workspace:**
  - identity status on the user details panel;
  - an "Identity checks" filter and queue;
  - a link to the session in Veriff's portal;
  - an audited approve/revoke action.
- **Privacy:**
  - update the privacy page to name Veriff as the identity provider and what it processes;
  - show a short consent line before the check starts.

## 7. Configuration

Server only, on Render (never `VITE_` variables):
- `VERIFF_API_KEY`, `VERIFF_SHARED_SECRET`
- `VERIFF_API_URL`: the base URL shown in the Veriff Customer Portal for the integration
- `IDENTITY_REQUIRED_FROM`: the date verification becomes required (ISO, e.g. `2026-11-01`). Unset means not enforced. Sellers who joined before it keep their listings public for 14 more days; sellers who join after it are hidden until verified.

In the Veriff Customer Portal:
- one **test** integration and one **live** integration;
- the decision webhook URL `https://<api host>/api/identity/webhooks/veriff`;
- the callback URL `https://<site>/dashboard/seller?tab=verification`.

## 8. Testing

- **Integration tests** with a fake Veriff server, like the Stripe/Paystack stubs:
  - session creation sends no personal data;
  - bad or missing signatures are rejected;
  - duplicate and out-of-order webhooks;
  - a late `abandoned` after `approved` does not downgrade;
  - the polling fallback;
  - rate limits;
  - listings are hidden and shown with `IDENTITY_REQUIRED_FROM`, including the grace period;
  - manager overrides are audited.
- **Component tests** for the seller verification card and the manager queue.
- **End to end** on the Veriff test integration, choosing each outcome, before switching to live keys.

## 9. Rollout

1. **Set up:** Veriff account and contract, data processing agreement, test integration keys. Confirm Ghana Card, passport and driver's licence coverage for our markets (GH, GB, US), and check data-protection obligations (Ghana's Data Protection Act; UK GDPR) with whoever handles legal.
2. **Build the backend:** migration 0017, the endpoints, the webhook and the manager view, with `IDENTITY_REQUIRED_FROM` unset. Split `verified` and fix the Google badge. *(Done.)*
3. **Build the frontend:** the seller card and Veriff modal, badges, the manager queue, and the privacy copy. *(Done.)* Test end to end on the test integration.
4. **Go live:** live keys. Set `IDENTITY_REQUIRED_FROM`: new sellers must verify; existing sellers get the 14-day grace period with dashboard reminders, then unverified listings are hidden.
5. **Later:** require verification for payouts; business verification and AML screening if needed.

Rough size: 3–5 days of development for steps 2–3, plus Veriff account setup time.

## References

- Veriff session creation: https://devdocs.veriff.com/apidocs/v1sessions
- Webhooks (headers, HMAC, retries, statuses): https://devdocs.veriff.com/docs/webhooks-guide
- Decision endpoint (fallback): https://devdocs.veriff.com/apidocs/v1sessionsiddecision-1
- InContext SDK: https://devdocs.veriff.com/docs/incontext-sdk-1
