-- Additive migration: products a signed-in customer has saved for later.
CREATE TABLE IF NOT EXISTS wishlist_items (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS wishlist_items_user_created_idx ON wishlist_items(user_id, created_at);
