-- Classification is based on the staff role, never an editable display name.
ALTER TABLE products ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'marketplace';
UPDATE products SET channel = 'shop'
WHERE seller_id IN (SELECT id FROM users WHERE role::text = 'china_representative');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_channel_valid' AND conrelid = 'products'::regclass) THEN
    ALTER TABLE products ADD CONSTRAINT products_channel_valid CHECK (channel IN ('marketplace', 'shop'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS products_channel_status_idx ON products(channel, status);
CREATE INDEX IF NOT EXISTS products_seller_idx ON products(seller_id);
