-- ============================================================
-- Transaction RPC Functions for Atomic Database Operations
-- Migration: 20260313000002_transaction_rpcs.sql
--
-- Replaces multi-step sequential queries with single atomic
-- database transactions to prevent inconsistent state.
--
-- Functions:
--   1. process_payment_and_complete_order — atomic payment + order completion
--   2. create_order_with_items — atomic order + items + table status
--   3. approve_stock_count — atomic count approval + adjustments
-- ============================================================

-- ============================================================
-- RPC 1: process_payment_and_complete_order
-- ============================================================
-- Atomically: create payment record + update order status to 'completed'
-- + release table + increment voucher usage + audit log
--
-- Mirrors logic from: apps/web/app/(pos)/pos/cashier/payment-actions.ts
-- ============================================================

CREATE OR REPLACE FUNCTION process_payment_and_complete_order(
  p_order_id BIGINT,
  p_pos_session_id BIGINT,
  p_terminal_id BIGINT,
  p_method TEXT,                   -- 'cash' | 'qr' | 'transfer'
  p_amount NUMERIC(14,2),
  p_tip NUMERIC(14,2) DEFAULT 0,
  p_provider TEXT DEFAULT NULL,    -- 'momo' | 'vietqr' | null
  p_status TEXT DEFAULT 'completed', -- 'completed' for cash, 'pending' for qr/transfer
  p_paid_at TIMESTAMPTZ DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_tenant_id BIGINT DEFAULT NULL,
  p_voucher_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_payment_id BIGINT;
  v_result JSONB;
BEGIN
  -- 1. Check idempotency (prevent double payment)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_payment_id
      FROM payments
      WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      SELECT jsonb_build_object(
        'payment_id', v_payment_id,
        'already_processed', true
      ) INTO v_result;
      RETURN v_result;
    END IF;
  END IF;

  -- 2. Lock the order row to prevent concurrent modifications
  SELECT id, branch_id, status, total, table_id, type
    INTO v_order
    FROM orders
    WHERE id = p_order_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đơn hàng không tồn tại: %', p_order_id;
  END IF;

  -- 3. Validate order can be paid (must not be completed/cancelled)
  IF v_order.status = 'completed' THEN
    RAISE EXCEPTION 'Đơn hàng đã thanh toán';
  END IF;
  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Đơn hàng đã bị hủy';
  END IF;

  -- 4. Create payment record
  --    Note: payments.pos_session_id and idempotency_key are NOT NULL in schema
  INSERT INTO payments (
    order_id, pos_session_id, terminal_id, method, provider,
    amount, tip, status, paid_at, idempotency_key
  ) VALUES (
    p_order_id, p_pos_session_id, p_terminal_id, p_method, p_provider,
    p_amount, p_tip, p_status, p_paid_at, p_idempotency_key
  ) RETURNING id INTO v_payment_id;

  -- 5. For completed payments (cash): update order status + release table
  IF p_status = 'completed' THEN
    -- Update order status
    UPDATE orders
    SET status = 'completed',
        pos_session_id = p_pos_session_id
    WHERE id = p_order_id;

    -- Record status transition in history
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
      VALUES (p_order_id, v_order.status, 'completed', p_user_id);

    -- Release table if dine-in with a table assigned
    IF v_order.table_id IS NOT NULL AND v_order.type = 'dine_in' THEN
      -- Only release if no other active orders on this table
      IF NOT EXISTS (
        SELECT 1 FROM orders
          WHERE table_id = v_order.table_id
            AND id != p_order_id
            AND status NOT IN ('completed', 'cancelled')
      ) THEN
        UPDATE tables SET status = 'available'
          WHERE id = v_order.table_id;
      END IF;
    END IF;

    -- Increment voucher usage if a voucher discount was applied
    IF p_voucher_id IS NOT NULL THEN
      UPDATE vouchers
      SET used_count = used_count + 1
      WHERE id = p_voucher_id;
    END IF;
  END IF;

  -- 6. Audit log (append-only)
  IF p_tenant_id IS NOT NULL AND p_user_id IS NOT NULL THEN
    INSERT INTO audit_logs (
      tenant_id, user_id, action, resource_type, resource_id, new_value
    ) VALUES (
      p_tenant_id, p_user_id, 'payment_processed', 'payment', v_payment_id,
      jsonb_build_object(
        'order_id', p_order_id,
        'method', p_method,
        'amount', p_amount,
        'tip', p_tip,
        'idempotency_key', p_idempotency_key
      )
    );
  END IF;

  -- 7. Return result
  SELECT jsonb_build_object(
    'payment_id', v_payment_id,
    'order_id', p_order_id,
    'already_processed', false
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION process_payment_and_complete_order IS
  'Atomic payment processing: creates payment, completes order, releases table, increments voucher usage, writes audit log — all in one transaction.';

-- ============================================================
-- RPC 2: create_order_with_items
-- ============================================================
-- Atomically: create order + insert order items + mark table occupied
-- + record status history + audit log
--
-- Mirrors logic from: apps/web/app/(pos)/pos/orders/order-mutations.ts
-- Note: Price validation, menu availability, and terminal checks
-- remain in the server action. This RPC handles only the write path.
-- ============================================================

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_branch_id BIGINT,
  p_type TEXT,                      -- 'dine_in' | 'takeaway' | 'delivery'
  p_terminal_id BIGINT,
  p_created_by UUID,
  p_idempotency_key UUID,
  p_order_number TEXT,
  p_subtotal NUMERIC(14,2),
  p_total NUMERIC(14,2),
  p_tax NUMERIC(14,2) DEFAULT 0,
  p_service_charge NUMERIC(14,2) DEFAULT 0,
  p_discount_total NUMERIC(14,2) DEFAULT 0,
  p_table_id BIGINT DEFAULT NULL,
  p_customer_id BIGINT DEFAULT NULL,
  p_guest_count INT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_tenant_id BIGINT DEFAULT NULL,   -- for audit log only (orders has no tenant_id)
  p_items JSONB DEFAULT '[]'::jsonb  -- [{menu_item_id, variant_id, quantity, unit_price, item_total, modifiers, notes}]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id BIGINT;
  v_item JSONB;
  v_result JSONB;
BEGIN
  -- 1. Check idempotency — if order already exists with this key, return it
  SELECT id INTO v_order_id
    FROM orders
    WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    SELECT jsonb_build_object(
      'order_id', v_order_id,
      'order_number', (SELECT order_number FROM orders WHERE id = v_order_id),
      'already_created', true
    ) INTO v_result;
    RETURN v_result;
  END IF;

  -- 2. Create order
  INSERT INTO orders (
    order_number, branch_id, table_id, customer_id, terminal_id,
    type, status, subtotal, discount_total, tax, service_charge, total,
    notes, created_by, idempotency_key, guest_count
  ) VALUES (
    p_order_number, p_branch_id, p_table_id, p_customer_id, p_terminal_id,
    p_type, 'draft', p_subtotal, p_discount_total, p_tax, p_service_charge, p_total,
    p_notes, p_created_by, p_idempotency_key, p_guest_count
  ) RETURNING id INTO v_order_id;

  -- 3. Insert order items
  INSERT INTO order_items (
    order_id, menu_item_id, variant_id, quantity,
    unit_price, item_total, modifiers, notes, status
  )
  SELECT
    v_order_id,
    (item->>'menu_item_id')::BIGINT,
    NULLIF((item->>'variant_id')::TEXT, '')::BIGINT,
    (item->>'quantity')::INT,
    (item->>'unit_price')::NUMERIC(12,2),
    (item->>'item_total')::NUMERIC(14,2),
    CASE WHEN item->'modifiers' IS NOT NULL AND item->>'modifiers' != 'null'
         THEN item->'modifiers' ELSE NULL END,
    NULLIF(item->>'notes', ''),
    'pending'
  FROM jsonb_array_elements(p_items) AS item;

  -- 4. Mark table as occupied if dine-in
  IF p_table_id IS NOT NULL AND p_type = 'dine_in' THEN
    UPDATE tables SET status = 'occupied'
      WHERE id = p_table_id;
  END IF;

  -- 5. Record initial status in history
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (v_order_id, NULL, 'draft', p_created_by);

  -- 6. Audit log
  IF p_tenant_id IS NOT NULL AND p_created_by IS NOT NULL THEN
    INSERT INTO audit_logs (
      tenant_id, user_id, action, resource_type, resource_id, new_value
    ) VALUES (
      p_tenant_id, p_created_by, 'order_created', 'order', v_order_id,
      jsonb_build_object(
        'order_number', p_order_number,
        'total', p_total,
        'item_count', jsonb_array_length(p_items)
      )
    );
  END IF;

  -- 7. Return result
  SELECT jsonb_build_object(
    'order_id', v_order_id,
    'order_number', p_order_number,
    'total', p_total,
    'already_created', false
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_order_with_items IS
  'Atomic order creation: inserts order + items + marks table occupied + status history + audit log — all in one transaction.';

-- ============================================================
-- RPC 3: approve_stock_count
-- ============================================================
-- Atomically: approve the count + create adjustment stock movements
-- + update stock levels (with optimistic locking)
--
-- Mirrors logic from: apps/web/app/(admin)/admin/inventory/inventory-ops-actions.ts
-- ============================================================

CREATE OR REPLACE FUNCTION approve_stock_count(
  p_count_id BIGINT,
  p_branch_id BIGINT,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count RECORD;
  v_item RECORD;
  v_variance NUMERIC(14,4);
  v_existing RECORD;
  v_result JSONB;
  v_adjustments_made INT := 0;
BEGIN
  -- 1. Lock the stock count row
  SELECT id, status, branch_id
    INTO v_count
    FROM stock_counts
    WHERE id = p_count_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Phiếu kiểm kho không tồn tại: %', p_count_id;
  END IF;

  -- 2. Validate branch ownership
  IF v_count.branch_id != p_branch_id THEN
    RAISE EXCEPTION 'Phiếu kiểm kho không thuộc chi nhánh của bạn';
  END IF;

  -- 3. Validate status
  IF v_count.status != 'submitted' THEN
    RAISE EXCEPTION 'Chỉ có thể duyệt phiếu ở trạng thái "Đã nộp" (hiện tại: %)', v_count.status;
  END IF;

  -- 4. Process each count item
  FOR v_item IN
    SELECT ingredient_id, system_qty, actual_qty
    FROM stock_count_items
    WHERE stock_count_id = p_count_id
  LOOP
    v_variance := v_item.actual_qty - v_item.system_qty;

    -- Skip items with no meaningful variance
    IF ABS(v_variance) < 0.001 THEN
      CONTINUE;
    END IF;

    v_adjustments_made := v_adjustments_made + 1;

    -- Create adjustment stock movement
    INSERT INTO stock_movements (
      ingredient_id, branch_id, type, quantity, notes, created_by
    ) VALUES (
      v_item.ingredient_id,
      p_branch_id,
      'adjust',
      ABS(v_variance),
      'Kiểm kho #' || p_count_id || ': '
        || CASE WHEN v_variance > 0 THEN 'thừa' ELSE 'thiếu' END
        || ' ' || TRIM(to_char(ABS(v_variance), '999999990.99')),
      p_user_id
    );

    -- Update stock_levels to match actual quantity
    SELECT id, version
      INTO v_existing
      FROM stock_levels
      WHERE ingredient_id = v_item.ingredient_id
        AND branch_id = p_branch_id
      FOR UPDATE;

    IF FOUND THEN
      UPDATE stock_levels
      SET quantity = v_item.actual_qty,
          version = v_existing.version + 1
      WHERE id = v_existing.id;
    ELSE
      -- No stock level row exists — create one
      INSERT INTO stock_levels (ingredient_id, branch_id, quantity)
        VALUES (v_item.ingredient_id, p_branch_id, v_item.actual_qty);
    END IF;
  END LOOP;

  -- 5. Approve the stock count (only after all adjustments succeed)
  UPDATE stock_counts
  SET status = 'approved',
      approved_by = p_user_id,
      approved_at = NOW()
  WHERE id = p_count_id;

  -- 6. Return result
  SELECT jsonb_build_object(
    'count_id', p_count_id,
    'status', 'approved',
    'adjustments_made', v_adjustments_made
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION approve_stock_count IS
  'Atomic stock count approval: updates stock levels + creates adjustment movements + approves count — all in one transaction.';

-- ============================================================
-- GRANT EXECUTE to authenticated role
-- ============================================================

GRANT EXECUTE ON FUNCTION process_payment_and_complete_order TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_items TO authenticated;
GRANT EXECUTE ON FUNCTION approve_stock_count TO authenticated;
