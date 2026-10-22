-- Additive migration: dLocal becomes the online payment provider for its
-- countries (Ghana today); Stripe stays for the rest. Paystack is kept as a
-- valid value so past Paystack orders and attempts remain valid records.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_valid;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_valid
  CHECK (payment_method IS NULL OR payment_method IN ('pay_on_delivery', 'mobile_money', 'bank_transfer', 'paystack', 'stripe', 'dlocal'));
ALTER TABLE payment_attempts DROP CONSTRAINT IF EXISTS payment_attempts_provider_valid;
ALTER TABLE payment_attempts ADD CONSTRAINT payment_attempts_provider_valid
  CHECK (provider IN ('paystack', 'stripe', 'dlocal'));

-- The national ID dLocal requires on each payment (e.g. the Ghana Card),
-- saved once per account, encrypted; only the last characters are readable.
CREATE TABLE IF NOT EXISTS payer_identities (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  country text NOT NULL,
  document_ciphertext text NOT NULL,
  document_hint text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Refunds of online payments, made by managers per order line.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
CREATE TABLE IF NOT EXISTS payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  attempt_id uuid NOT NULL REFERENCES payment_attempts(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_refund_id text UNIQUE,
  amount_minor bigint NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text NOT NULL,
  order_item_ids uuid[] NOT NULL,
  includes_shipping boolean NOT NULL DEFAULT false,
  failure_reason text,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE payment_refunds ADD CONSTRAINT payment_refunds_valid CHECK (
    provider IN ('stripe', 'dlocal') AND amount_minor > 0 AND status IN ('pending', 'succeeded', 'failed')
    AND char_length(reason) BETWEEN 1 AND 500
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS payment_refunds_order_idx ON payment_refunds (order_id, created_at DESC);

-- Where a seller is paid (mobile money wallet or bank account). The wallet
-- number or account number is encrypted; only its last digits are readable.
CREATE TABLE IF NOT EXISTS payout_accounts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  country text NOT NULL,
  method text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  wallet_type text,
  bank_code text,
  account_ciphertext text NOT NULL,
  account_hint text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE payout_accounts ADD CONSTRAINT payout_accounts_valid CHECK (
    (method = 'mobile_money' AND wallet_type IS NOT NULL AND bank_code IS NULL)
    OR (method = 'bank_transfer' AND bank_code IS NOT NULL AND wallet_type IS NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payouts of sellers' earnings through dLocal, one per seller and currency.
CREATE TABLE IF NOT EXISTS seller_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  external_id text NOT NULL UNIQUE,
  provider_payout_id text UNIQUE,
  -- What was owed, in the currency it was earned in...
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL,
  -- ...and what was sent, after any conversion.
  payout_amount numeric(14, 2) NOT NULL,
  payout_currency text NOT NULL,
  exchange_rate numeric(18, 8) NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  status_detail text,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE seller_payouts ADD CONSTRAINT seller_payouts_valid CHECK (
    amount > 0 AND payout_amount > 0
    AND status IN ('pending', 'processing', 'paid', 'rejected', 'cancelled', 'on_hold')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS seller_payouts_account_idx ON seller_payouts (account_id, created_at DESC);
