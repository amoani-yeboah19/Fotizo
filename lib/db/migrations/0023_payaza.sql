-- Preserve historical records; new checkout accepts Payaza only.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_valid;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_valid CHECK (payment_method IS NULL OR payment_method IN ('pay_on_delivery','mobile_money','bank_transfer','paystack','stripe','dlocal','payaza'));
ALTER TABLE payment_attempts DROP CONSTRAINT IF EXISTS payment_attempts_provider_valid;
ALTER TABLE payment_attempts ADD CONSTRAINT payment_attempts_provider_valid CHECK (provider IN ('paystack','stripe','dlocal','payaza'));
