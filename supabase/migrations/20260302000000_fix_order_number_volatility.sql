-- Fix: generate_order_number should be VOLATILE (not STABLE)
-- STABLE functions can be inlined within a transaction snapshot,
-- causing concurrent calls to produce duplicate order numbers.
-- VOLATILE ensures each call sees the latest committed rows.

CREATE OR REPLACE FUNCTION generate_order_number(p_branch_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_code TEXT;
  v_date TEXT;
  v_seq  INT;
BEGIN
  SELECT code INTO v_code FROM branches WHERE id = p_branch_id;
  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Branch % not found', p_branch_id;
  END IF;

  v_date := TO_CHAR(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYYMMDD');

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(order_number, '-', 3) AS INT)
  ), 0) + 1
  INTO v_seq
  FROM orders
  WHERE branch_id = p_branch_id
    AND order_number LIKE v_code || '-' || v_date || '-%';

  RETURN v_code || '-' || v_date || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$;
