-- Atomic RPC for Momo webhook payment success handling.
-- Ensures payment + order + table + voucher updates happen in a single transaction.
-- SECURITY INVOKER: executes with caller's privileges (service role for webhooks).

CREATE OR REPLACE FUNCTION handle_momo_payment_success(
  p_request_id TEXT,
  p_trans_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_payment RECORD;
  v_order RECORD;
  v_voucher_id BIGINT;
BEGIN
  -- Find payment by idempotency_key
  SELECT id, status, order_id, pos_session_id
  INTO v_payment
  FROM payments
  WHERE idempotency_key = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'payment_not_found');
  END IF;

  -- Idempotent: already completed — no-op
  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'already_completed');
  END IF;

  -- 1. Update payment to completed
  UPDATE payments
  SET status = 'completed',
      reference_no = p_trans_id,
      paid_at = NOW()
  WHERE id = v_payment.id;

  -- 2. Get order details
  SELECT id, table_id, type
  INTO v_order
  FROM orders
  WHERE id = v_payment.order_id;

  IF FOUND THEN
    -- 3. Update order to completed
    UPDATE orders
    SET status = 'completed',
        pos_session_id = v_payment.pos_session_id
    WHERE id = v_order.id;

    -- 4. Free table if dine_in
    IF v_order.table_id IS NOT NULL AND v_order.type = 'dine_in' THEN
      UPDATE tables
      SET status = 'available'
      WHERE id = v_order.table_id;
    END IF;

    -- 5. Increment voucher usage if applicable
    SELECT voucher_id INTO v_voucher_id
    FROM order_discounts
    WHERE order_id = v_order.id AND type = 'voucher'
    LIMIT 1;

    IF v_voucher_id IS NOT NULL THEN
      PERFORM increment_voucher_usage(v_voucher_id);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'payment_id', v_payment.id,
    'order_id', v_payment.order_id
  );
END;
$$;
