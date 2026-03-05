-- Fix: FOR UPDATE is not allowed with aggregate functions (SUM)
-- Split the locking and aggregation into separate queries.
-- The table row lock (first query) prevents concurrent capacity races.
-- The PERFORM ... FOR UPDATE locks the relevant order rows before aggregating.

CREATE OR REPLACE FUNCTION validate_table_capacity(
  p_table_id BIGINT,
  p_branch_id BIGINT,
  p_guest_count INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity INTEGER;
  v_occupied INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Lock the table row to prevent concurrent capacity races
  SELECT capacity INTO v_capacity
  FROM tables
  WHERE id = p_table_id AND branch_id = p_branch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'TABLE_NOT_FOUND');
  END IF;

  -- Lock the relevant order rows first (FOR UPDATE cannot be combined with aggregates)
  PERFORM 1
  FROM orders
  WHERE table_id = p_table_id
    AND branch_id = p_branch_id
    AND status IN ('draft', 'confirmed', 'preparing', 'ready', 'served')
  FOR UPDATE;

  -- Now aggregate guest counts (rows are already locked above)
  SELECT COALESCE(SUM(guest_count), 0) INTO v_occupied
  FROM orders
  WHERE table_id = p_table_id
    AND branch_id = p_branch_id
    AND status IN ('draft', 'confirmed', 'preparing', 'ready', 'served');

  v_remaining := COALESCE(v_capacity, 0) - v_occupied;

  IF p_guest_count > v_remaining THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'CAPACITY_EXCEEDED',
      'capacity', COALESCE(v_capacity, 0),
      'occupied', v_occupied,
      'remaining', v_remaining
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'capacity', COALESCE(v_capacity, 0),
    'occupied', v_occupied,
    'remaining', v_remaining
  );
END;
$$;
