-- Additive migration: a signed-in customer's cart, so it survives refreshes
-- and follows the account across devices. Prices are read live at display
-- time and fixed by the server at checkout.
CREATE TABLE IF NOT EXISTS cart_items (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CONSTRAINT cart_items_quantity_valid CHECK (quantity BETWEEN 1 AND 99),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS cart_items_user_added_idx ON cart_items(user_id, added_at);
