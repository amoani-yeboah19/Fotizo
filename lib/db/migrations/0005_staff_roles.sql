-- Additive migration. Databases created before the regional and China
-- representative roles existed only allow buyer, seller, manager and developer.
-- New enum values are not used in this transaction, so adding them here is safe.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'representative';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'china_representative';
