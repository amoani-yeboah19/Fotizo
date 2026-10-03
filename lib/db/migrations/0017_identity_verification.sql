-- Additive migration: seller identity verification through Veriff, and
-- separating "email confirmed by Google" from "verified by Fotizo".

-- Where the account is in identity verification. Only sellers need it.
--   none -> pending (a Veriff session is open) -> approved | declined |
--   resubmission_requested | review (Veriff or a manager must look again,
--   e.g. the verified name does not match the account name)
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_status text NOT NULL DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz;
-- Google confirmed the email address. Previously this set users.verified,
-- which is shown publicly as "Verified by Fotizo".
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_identity_status_valid
    CHECK (identity_status IN ('none', 'pending', 'review', 'approved', 'declined', 'resubmission_requested'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Google accounts have a confirmed email. Their "verified" flag came from
-- Google sign-in unless a manager verified them (recorded in the audit trail),
-- so it is cleared for the rest.
UPDATE users SET email_verified = true WHERE google_id IS NOT NULL AND NOT email_verified;
UPDATE users u SET verified = false
WHERE u.google_id IS NOT NULL
  AND u.verified
  AND NOT EXISTS (
    SELECT 1 FROM admin_audit a
    WHERE a.target_id = u.id AND a.action = 'user.verify'
  );

-- One row per Veriff session. Only the decision and document type/country are
-- kept; images, document numbers and personal details stay with Veriff.
CREATE TABLE IF NOT EXISTS identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'veriff',
  session_id text NOT NULL,
  session_url text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  decision_code integer,
  reason text,
  reason_code integer,
  document_type text,
  document_country text,
  name_matches boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  decided_at timestamptz,
  CONSTRAINT identity_verifications_status_valid CHECK (status IN
    ('created', 'started', 'submitted', 'approved', 'declined', 'resubmission_requested', 'expired', 'abandoned', 'review'))
);
CREATE UNIQUE INDEX IF NOT EXISTS identity_verifications_session_idx ON identity_verifications (provider, session_id);
CREATE INDEX IF NOT EXISTS identity_verifications_user_idx ON identity_verifications (user_id, created_at DESC);

-- Webhook deliveries already processed (Veriff delivers at least once).
-- Keyed by a hash of the body; no payload is stored.
CREATE TABLE IF NOT EXISTS identity_webhook_events (
  provider text NOT NULL,
  event_hash text NOT NULL,
  session_id text,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_hash)
);
