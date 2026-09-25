-- Account state and its audit history must change in one transaction.
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS account_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action text NOT NULL CONSTRAINT account_audit_action_valid CHECK (action IN ('suspend', 'reactivate')),
  reason text NOT NULL CONSTRAINT account_audit_reason_valid CHECK (char_length(btrim(reason)) BETWEEN 10 AND 1000),
  status_version integer NOT NULL,
  previous_suspended_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS account_audit_target_version_idx ON account_audit(target_user_id, status_version);
CREATE INDEX IF NOT EXISTS account_audit_created_idx ON account_audit(created_at, id);
CREATE INDEX IF NOT EXISTS users_role_created_idx ON users(role, created_at, id);
