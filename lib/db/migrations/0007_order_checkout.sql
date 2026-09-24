-- Additive migration: checkout with offline payment (pay on delivery, mobile
-- money or bank transfer). Orders keep a delivery snapshot, the chosen payment
-- method and a payment status that staff update when money is received.
-- Orders created before this migration keep NULL delivery fields.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal numeric(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping numeric(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line1 text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_valid' AND conrelid = 'orders'::regclass) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_valid
      CHECK (payment_method IS NULL OR payment_method IN ('pay_on_delivery', 'mobile_money', 'bank_transfer'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_valid' AND conrelid = 'orders'::regclass) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_status_valid CHECK (payment_status IN ('unpaid', 'paid'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS orders_reference_idx ON orders(reference) WHERE reference IS NOT NULL;
-- A retried checkout submission returns the order it already created.
CREATE UNIQUE INDEX IF NOT EXISTS orders_buyer_idempotency_idx ON orders(buyer_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_buyer_created_idx ON orders(buyer_id, created_at);
CREATE INDEX IF NOT EXISTS order_items_seller_idx ON order_items(seller_id);
