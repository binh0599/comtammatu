-- ============================================
-- POS & KDS Functions, Triggers, and Seed Data
-- Supports: order number generation, KDS ticket routing,
--           order status history, and auto-status updates
-- ============================================

-- ===== 1. Order Number Generation =====
-- Format: {branch_code}-{YYYYMMDD}-{sequence_padded_3}
-- Example: Q1-20260301-001

CREATE OR REPLACE FUNCTION generate_order_number(p_branch_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
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


-- ===== 2. KDS Ticket Auto-Creation Trigger =====
-- Fires when an order transitions from 'draft' to 'confirmed'.
-- Routes order items to KDS stations via kds_station_categories junction.

CREATE OR REPLACE FUNCTION create_kds_tickets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_station RECORD;
  v_items   JSONB;
BEGIN
  -- Only fire when status changes to 'confirmed' from 'draft'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    -- For each active KDS station that handles categories in this order
    FOR v_station IN
      SELECT DISTINCT ks.id AS station_id
      FROM kds_stations ks
      JOIN kds_station_categories ksc ON ksc.station_id = ks.id
      JOIN menu_items mi ON mi.category_id = ksc.category_id
      JOIN order_items oi ON oi.menu_item_id = mi.id AND oi.order_id = NEW.id
      WHERE ks.branch_id = NEW.branch_id
        AND ks.is_active = true
        AND oi.status = 'pending'
    LOOP
      -- Gather items for this station as JSONB array
      SELECT jsonb_agg(jsonb_build_object(
        'order_item_id', oi.id,
        'menu_item_id', mi.id,
        'menu_item_name', mi.name,
        'quantity', oi.quantity,
        'modifiers', oi.modifiers,
        'notes', oi.notes,
        'variant_name', miv.name
      ))
      INTO v_items
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      JOIN kds_station_categories ksc ON ksc.category_id = mi.category_id
                                     AND ksc.station_id = v_station.station_id
      LEFT JOIN menu_item_variants miv ON miv.id = oi.variant_id
      WHERE oi.order_id = NEW.id
        AND oi.status = 'pending';

      IF v_items IS NOT NULL THEN
        -- Create KDS ticket
        INSERT INTO kds_tickets (order_id, station_id, items, status, priority)
        VALUES (NEW.id, v_station.station_id, v_items, 'pending', 0);

        -- Update order items: mark as sent to KDS
        UPDATE order_items
        SET status = 'sent_to_kds',
            kds_station_id = v_station.station_id,
            sent_to_kds_at = NOW()
        WHERE order_id = NEW.id
          AND status = 'pending'
          AND menu_item_id IN (
            SELECT mi2.id
            FROM menu_items mi2
            JOIN kds_station_categories ksc2 ON ksc2.category_id = mi2.category_id
            WHERE ksc2.station_id = v_station.station_id
          );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_kds_tickets
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_kds_tickets();


-- ===== 3. Order Auto-Update from KDS Trigger =====
-- When ALL kds_tickets for an order are 'ready', auto-set order status to 'ready'.

CREATE OR REPLACE FUNCTION update_order_from_kds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
    -- Check if ALL tickets for this order are now 'ready'
    IF NOT EXISTS (
      SELECT 1
      FROM kds_tickets
      WHERE order_id = NEW.order_id
        AND status != 'ready'
    ) THEN
      UPDATE orders
      SET status = 'ready',
          updated_at = NOW()
      WHERE id = NEW.order_id
        AND status != 'ready';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_order_from_kds
  AFTER UPDATE ON kds_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_order_from_kds();


-- ===== 4. Order Status History Trigger =====
-- Records every order status change for audit trail.

CREATE OR REPLACE FUNCTION record_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, terminal_id)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.terminal_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_status_history
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION record_order_status_change();


-- NOTE: Seed data for POS terminals, KDS stations, and timing rules
-- is in supabase/seed.sql (run via `supabase db reset`)
