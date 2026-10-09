-- Retain order references while distinguishing owner deletion from moderation.
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE services ADD COLUMN IF NOT EXISTS details jsonb NOT NULL
  DEFAULT '{"faqs":[],"requirements":[],"gallery":[]}'::jsonb;
CREATE INDEX IF NOT EXISTS products_owner_visible_idx ON products (seller_id) WHERE deleted_at IS NULL;
