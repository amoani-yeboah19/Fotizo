-- Additive migration: images uploaded to Supabase Storage. Each row records who
-- uploaded a file and for what, so listings only accept their owner's uploads.
CREATE TABLE IF NOT EXISTS media_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CONSTRAINT media_uploads_purpose_valid CHECK (purpose IN ('product', 'service')),
  bucket text NOT NULL,
  path text NOT NULL,
  content_type text NOT NULL
    CONSTRAINT media_uploads_content_type_valid CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  bytes integer NOT NULL CONSTRAINT media_uploads_bytes_valid CHECK (bytes > 0 AND bytes <= 5242880),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_uploads_object_unique UNIQUE (bucket, path)
);
CREATE INDEX IF NOT EXISTS media_uploads_owner_created_idx ON media_uploads(owner_id, created_at DESC);
