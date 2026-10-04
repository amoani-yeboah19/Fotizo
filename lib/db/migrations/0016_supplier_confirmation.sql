-- Additive migration: imported (supplier-sourced) goods are confirmed before
-- the buyer pays. Fotizo checks the requested options, final price, the
-- supplier's minimum order and delivery, sends a confirmed quote, and the buyer
-- accepts (and pays) or cancels.

-- NULL: the order needs no confirmation (marketplace goods only).
-- awaiting -> quoted -> accepted, or declined (by Fotizo), withdrawn (by the
-- buyer) or expired (quote not accepted in time).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_note text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_days_min integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_days_max integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quoted_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quoted_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_expires_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_confirmation_status_valid
    CHECK (confirmation_status IS NULL OR confirmation_status IN
      ('awaiting', 'quoted', 'accepted', 'declined', 'withdrawn', 'expired'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_delivery_days_valid
    CHECK (delivery_days_min IS NULL OR (delivery_days_min >= 0 AND delivery_days_max >= delivery_days_min));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS orders_confirmation_queue_idx
  ON orders (confirmation_status, created_at) WHERE confirmation_status IS NOT NULL;

-- Per line: what the buyer asked for, what Fotizo confirmed, and the estimated
-- price shown at checkout (price becomes the confirmed price once quoted).
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS needs_confirmation boolean NOT NULL DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS requested_options text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS confirmed_options text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS estimated_price numeric(10, 2);
