-- Add 'transfer' (bank transfer / VietQR) as a payment method
-- This alters the CHECK constraint on payments.method to include 'transfer'

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_method_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_method_check
  CHECK (method IN ('cash', 'card', 'ewallet', 'qr', 'transfer'));
