-- Add 'expired' to payments status CHECK constraint
-- Pending payments stuck >30min (webhook lost, customer abandoned) need a clean status.

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'expired'));

-- Partial index for the expiry cron to quickly find stale pending payments
CREATE INDEX IF NOT EXISTS idx_payments_pending_created
  ON payments (created_at)
  WHERE status = 'pending';
