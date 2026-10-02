-- Additive migration: supplier sourcing and cost for imported goods, and the
-- platform fee ledger (per paid booking and per product unit sold).

-- Where an imported product came from and what it cost. The selling price is
-- calculated from this (supplier cost x markup, converted to GBP at the
-- recorded rate); freight and other costs are not included.
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_platform text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_product_id text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_currency text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_cost numeric(14, 4);
-- Supplier-currency units per GBP used to convert the cost, e.g. 1.27 USD/GBP.
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_rate numeric(18, 8);
ALTER TABLE products ADD COLUMN IF NOT EXISTS markup_percent numeric(6, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_basis text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS priced_at timestamptz;

DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_source_platform_valid
    CHECK (source_platform IS NULL OR source_platform IN ('alibaba', 'taobao', 'pinduoduo', 'tuwa'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_supplier_cost_positive
    CHECK (supplier_cost IS NULL OR (supplier_cost > 0 AND supplier_rate > 0 AND supplier_currency IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- quoted: the supplier's own price; recovered: approximated from an older listing price.
  ALTER TABLE products ADD CONSTRAINT products_price_basis_valid
    CHECK (price_basis IS NULL OR price_basis IN ('quoted', 'recovered'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One listing per supplier product.
CREATE UNIQUE INDEX IF NOT EXISTS products_source_unique
  ON products(source_platform, source_product_id)
  WHERE source_platform IS NOT NULL AND source_product_id IS NOT NULL;

-- Fees Fotizo charges the provider or seller. Recorded server-side when a
-- booking or sale qualifies; collection (deduction from payouts) is a later
-- step, so new fees start as pending.
CREATE TABLE IF NOT EXISTS platform_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CONSTRAINT platform_fees_kind_valid CHECK (kind IN ('booking', 'unit_sale')),
  account_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  booking_id uuid REFERENCES bookings(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  order_item_id uuid REFERENCES order_items(id) ON DELETE RESTRICT,
  reference text NOT NULL,
  currency text NOT NULL CONSTRAINT platform_fees_currency_valid CHECK (currency IN ('GHS', 'USD', 'GBP', 'EUR')),
  quantity integer NOT NULL DEFAULT 1 CONSTRAINT platform_fees_quantity_positive CHECK (quantity > 0),
  amount numeric(12, 2) NOT NULL CONSTRAINT platform_fees_amount_positive CHECK (amount > 0),
  -- What the customer paid for this booking or line, in the same currency.
  gross_amount numeric(12, 2) NOT NULL CONSTRAINT platform_fees_gross_nonnegative CHECK (gross_amount >= 0),
  status text NOT NULL DEFAULT 'pending'
    CONSTRAINT platform_fees_status_valid CHECK (status IN ('pending', 'collected', 'waived', 'reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_fees_subject CHECK (
    (kind = 'booking' AND booking_id IS NOT NULL AND order_item_id IS NULL) OR
    (kind = 'unit_sale' AND order_item_id IS NOT NULL AND order_id IS NOT NULL AND booking_id IS NULL)
  )
);
-- A booking or an order line is charged once, however often payment is confirmed.
CREATE UNIQUE INDEX IF NOT EXISTS platform_fees_booking_unique ON platform_fees(booking_id) WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS platform_fees_order_item_unique ON platform_fees(order_item_id) WHERE order_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS platform_fees_account_created_idx ON platform_fees(account_id, created_at DESC);
