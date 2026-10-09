-- Additive migration: the options a buyer chose (colour, size and so on) are
-- saved with each cart line, so the same product can be in the cart in two
-- sizes. An empty string means the product has no options.
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS options text NOT NULL DEFAULT '';
DO $$ BEGIN
  ALTER TABLE cart_items ADD CONSTRAINT cart_items_options_length CHECK (char_length(options) <= 200);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_pkey;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_pkey PRIMARY KEY (user_id, product_id, options);
