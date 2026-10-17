-- Additive migration: browser push subscriptions, and the urgent alerts buyers
-- send once an order line is past its delivery date (at most one per line a day).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_length CHECK (char_length(endpoint) <= 1000)
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS urgent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- How many devices and inboxes the alert reached, for support.
  push_sent integer NOT NULL DEFAULT 0,
  email_sent integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS urgent_alerts_line_idx ON urgent_alerts (order_item_id, created_at DESC);
