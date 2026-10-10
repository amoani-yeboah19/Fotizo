-- Additive migration: 1688.com as a supplier platform for imported shop goods.
-- It is distinct from Alibaba.com (retired at launch) and is priced like the
-- other Chinese platforms (supplier cost x 1.30).
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_source_platform_valid;
ALTER TABLE products ADD CONSTRAINT products_source_platform_valid
  CHECK (source_platform IS NULL OR source_platform IN ('alibaba', '1688', 'taobao', 'pinduoduo', 'tuwa'));
