-- Additive migration: online payment through Paystack (Ghana, GHS) and Stripe
-- (international, GBP). An order is marked paid only after the provider
-- confirms the charge; each redirect to a provider is a payment attempt.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_valid;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_valid
  CHECK (payment_method IS NULL OR payment_method IN ('pay_on_delivery', 'mobile_money', 'bank_transfer', 'paystack', 'stripe'));

CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL CONSTRAINT payment_attempts_provider_valid CHECK (provider IN ('paystack', 'stripe')),
  -- Our reference, sent to the provider (Paystack transaction reference).
  reference text NOT NULL UNIQUE,
  -- The provider's own id (Stripe Checkout Session id).
  provider_session_id text UNIQUE,
  amount_minor bigint NOT NULL CONSTRAINT payment_attempts_amount_valid CHECK (amount_minor > 0),
  currency text NOT NULL,
  -- GBP -> charge currency rate locked for this attempt (1 for GBP).
  exchange_rate numeric(18, 8) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CONSTRAINT payment_attempts_status_valid
    CHECK (status IN ('pending', 'succeeded', 'failed', 'expired')),
  checkout_url text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS payment_attempts_order_created_idx ON payment_attempts(order_id, created_at);

-- Provider webhook deliveries already processed; repeats are ignored.
CREATE TABLE IF NOT EXISTS payment_events (
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);
