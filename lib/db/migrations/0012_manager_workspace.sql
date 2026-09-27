-- Additive migration: manager workspace — administrative audit trail, listing
-- moderation holds and reviews, and order disputes.

-- One append-only history of administrative decisions. The actor's name is
-- snapshotted so the record reads the same after a rename.
CREATE TABLE IF NOT EXISTS admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name text NOT NULL,
  action text NOT NULL CONSTRAINT admin_audit_action_length CHECK (char_length(action) BETWEEN 1 AND 80),
  target_type text NOT NULL
    CONSTRAINT admin_audit_target_type_valid CHECK (target_type IN ('user', 'product', 'service', 'submission', 'dispute')),
  target_id uuid NOT NULL,
  target_label text NOT NULL,
  reason text NOT NULL CONSTRAINT admin_audit_reason_length CHECK (char_length(btrim(reason)) BETWEEN 5 AND 1000),
  before jsonb NOT NULL DEFAULT '{}',
  after jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit(created_at DESC, id);
CREATE INDEX IF NOT EXISTS admin_audit_target_idx ON admin_audit(target_id, created_at DESC);

-- Audit and review history can be added to but never rewritten.
CREATE OR REPLACE FUNCTION fotizo_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;
DROP TRIGGER IF EXISTS admin_audit_append_only ON admin_audit;
CREATE TRIGGER admin_audit_append_only BEFORE UPDATE OR DELETE ON admin_audit
  FOR EACH ROW EXECUTE FUNCTION fotizo_append_only();

-- Earlier account suspensions join the same history (same ids, so re-running is harmless).
INSERT INTO admin_audit (id, actor_id, actor_name, action, target_type, target_id, target_label, reason, before, after, created_at)
SELECT a.id, a.actor_id, actor.name,
       CASE a.action WHEN 'suspend' THEN 'user.suspend' ELSE 'user.reinstate' END,
       'user', a.target_user_id, target.name, a.reason,
       jsonb_build_object('status', CASE WHEN a.previous_suspended_at IS NULL THEN 'active' ELSE 'suspended' END),
       jsonb_build_object('status', CASE WHEN a.suspended_at IS NULL THEN 'active' ELSE 'suspended' END),
       a.created_at
FROM account_audit a
JOIN users actor ON actor.id = a.actor_id
JOIN users target ON target.id = a.target_user_id
ON CONFLICT (id) DO NOTHING;

-- A hold placed by staff (unpublishing or rejecting) that the owner cannot clear.
ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_hold boolean NOT NULL DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS moderation_hold boolean NOT NULL DEFAULT false;

-- Review of seller listings. One review per listing; each content change is a
-- new version whose submitted snapshot is kept in the event history.
CREATE TABLE IF NOT EXISTS listing_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CONSTRAINT listing_reviews_kind_valid CHECK (kind IN ('product', 'service')),
  listing_id uuid NOT NULL,
  seller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CONSTRAINT listing_reviews_status_valid CHECK (status IN ('pending', 'approved', 'rejected')),
  version integer NOT NULL DEFAULT 1 CONSTRAINT listing_reviews_version_positive CHECK (version > 0),
  snapshot jsonb NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CONSTRAINT listing_reviews_listing_unique UNIQUE (kind, listing_id)
);
CREATE INDEX IF NOT EXISTS listing_reviews_status_submitted_idx ON listing_reviews(status, submitted_at DESC, id);

CREATE TABLE IF NOT EXISTS listing_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES listing_reviews(id) ON DELETE CASCADE,
  action text NOT NULL
    CONSTRAINT listing_review_events_action_valid CHECK (action IN ('submitted', 'resubmitted', 'approved', 'rejected')),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  reason text NOT NULL CONSTRAINT listing_review_events_reason_length CHECK (char_length(reason) BETWEEN 1 AND 1000),
  version integer NOT NULL,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listing_review_events_review_idx ON listing_review_events(review_id, created_at DESC);

-- Disputes raised by buyers about an order.
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL
    CONSTRAINT disputes_category_valid CHECK (category IN ('not_received', 'damaged', 'not_as_described', 'wrong_item', 'delivery', 'other')),
  summary text NOT NULL CONSTRAINT disputes_summary_length CHECK (char_length(btrim(summary)) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'open'
    CONSTRAINT disputes_status_valid CHECK (status IN ('open', 'reviewing', 'escalated', 'resolved')),
  priority text NOT NULL DEFAULT 'normal' CONSTRAINT disputes_priority_valid CHECK (priority IN ('normal', 'high')),
  version integer NOT NULL DEFAULT 1 CONSTRAINT disputes_version_positive CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- At most one unresolved dispute per order.
CREATE UNIQUE INDEX IF NOT EXISTS disputes_one_active_per_order ON disputes(order_id) WHERE status <> 'resolved';
CREATE INDEX IF NOT EXISTS disputes_created_idx ON disputes(created_at DESC, id);

CREATE TABLE IF NOT EXISTS dispute_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  statement text NOT NULL CONSTRAINT dispute_statements_length CHECK (char_length(btrim(statement)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dispute_statements_dispute_idx ON dispute_statements(dispute_id, created_at);

CREATE TABLE IF NOT EXISTS dispute_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  action text NOT NULL,
  reason text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dispute_events_dispute_idx ON dispute_events(dispute_id, created_at DESC);
DROP TRIGGER IF EXISTS dispute_events_append_only ON dispute_events;
CREATE TRIGGER dispute_events_append_only BEFORE UPDATE OR DELETE ON dispute_events
  FOR EACH ROW EXECUTE FUNCTION fotizo_append_only();
