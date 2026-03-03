-- ============================================
-- Order Status Notifications
-- Auto-creates in-app notifications when order status changes.
-- Uses pg_notify for Supabase Realtime broadcast.
-- ============================================

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order     RECORD;
  v_title     TEXT;
  v_body      TEXT;
  v_ntype     TEXT;
BEGIN
  -- Look up the order to get tenant_id, created_by, order_number, branch_id
  SELECT o.tenant_id, o.created_by, o.order_number, o.branch_id
  INTO v_order
  FROM orders o
  WHERE o.id = NEW.order_id;

  IF v_order IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map status to notification text
  CASE NEW.to_status
    WHEN 'confirmed' THEN
      v_title := 'Đơn đã xác nhận';
      v_body  := 'Đơn ' || v_order.order_number || ' đã xác nhận, đang chuyển bếp';
      v_ntype := 'new_order';
    WHEN 'preparing' THEN
      v_title := 'Bếp đang chuẩn bị';
      v_body  := 'Đơn ' || v_order.order_number || ' đang được chuẩn bị';
      v_ntype := 'info';
    WHEN 'ready' THEN
      v_title := 'Đơn sẵn sàng!';
      v_body  := 'Đơn ' || v_order.order_number || ' đã sẵn sàng phục vụ';
      v_ntype := 'order_ready';
    WHEN 'served' THEN
      v_title := 'Đã phục vụ';
      v_body  := 'Đơn ' || v_order.order_number || ' đã phục vụ, chờ thanh toán';
      v_ntype := 'info';
    WHEN 'completed' THEN
      v_title := 'Thanh toán hoàn tất';
      v_body  := 'Đơn ' || v_order.order_number || ' đã thanh toán xong';
      v_ntype := 'info';
    WHEN 'cancelled' THEN
      v_title := 'Đơn đã hủy';
      v_body  := 'Đơn ' || v_order.order_number || ' đã bị hủy';
      v_ntype := 'order_cancelled';
    ELSE
      -- Skip unknown statuses
      RETURN NEW;
  END CASE;

  -- Insert notification record for the order creator
  INSERT INTO notifications (tenant_id, user_id, channel, title, body, data)
  VALUES (
    v_order.tenant_id,
    v_order.created_by,
    'in_app',
    v_title,
    v_body,
    jsonb_build_object(
      'order_id', NEW.order_id,
      'order_number', v_order.order_number,
      'from_status', NEW.from_status,
      'to_status', NEW.to_status,
      'type', v_ntype,
      'branch_id', v_order.branch_id
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_order_status
  AFTER INSERT ON order_status_history
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();
