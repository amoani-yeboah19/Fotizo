-- Additive migration: account profile photos are uploaded like listing photos.
ALTER TABLE media_uploads DROP CONSTRAINT IF EXISTS media_uploads_purpose_valid;
ALTER TABLE media_uploads ADD CONSTRAINT media_uploads_purpose_valid CHECK (purpose IN ('product', 'service', 'avatar'));
