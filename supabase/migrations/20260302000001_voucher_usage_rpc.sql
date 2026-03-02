-- ============================================
-- Voucher Usage Increment RPC
-- Atomically increments used_count after payment
-- ============================================

CREATE OR REPLACE FUNCTION increment_voucher_usage(p_voucher_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE vouchers
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = p_voucher_id;
END;
$$;

COMMENT ON FUNCTION increment_voucher_usage(BIGINT) IS
  'Atomically increments voucher used_count after successful payment.';
