-- Additive migration: customer reviews of products and services. Only buyers
-- with a delivered order (products) or a completed booking (services) can
-- review, once per listing; they can edit or remove their review.
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  rating smallint NOT NULL,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_comment_length CHECK (char_length(comment) <= 2000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_one_listing CHECK ((product_id IS NULL) <> (service_id IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_author_product_idx ON reviews (author_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_author_service_idx ON reviews (author_id, service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews (product_id, created_at DESC) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reviews_service_idx ON reviews (service_id, created_at DESC) WHERE service_id IS NOT NULL;
