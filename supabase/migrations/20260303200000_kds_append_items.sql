-- Migration: Add trigger to append items to KDS when inserted directly into order_items
-- This handles the case where addOrderItems is called on an already confirmed/served order.

CREATE OR REPLACE FUNCTION append_kds_tickets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_station RECORD;
  v_item    JSONB;
  v_order   orders%ROWTYPE;
BEGIN
  -- Only process items if their order is already active (confirmed, preparing, ready, served)
  SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
  
  IF v_order.status IN ('confirmed', 'preparing', 'ready', 'served') AND NEW.status = 'pending' THEN
    -- Find which stations need this item
    FOR v_station IN
      SELECT DISTINCT ks.id AS station_id, ksc.category_id
      FROM kds_stations ks
      JOIN kds_station_categories ksc ON ksc.station_id = ks.id
      JOIN menu_items mi ON mi.category_id = ksc.category_id AND mi.id = NEW.menu_item_id
      WHERE ks.branch_id = v_order.branch_id
        AND ks.is_active = true
    LOOP
      -- Build the JSON object for this single ticket item
      SELECT jsonb_build_object(
        'order_item_id', NEW.id,
        'menu_item_id', mi.id,
        'menu_item_name', mi.name,
        'quantity', NEW.quantity,
        'modifiers', NEW.modifiers,
        'notes', NEW.notes,
        'variant_name', miv.name
      )
      INTO v_item
      FROM menu_items mi
      LEFT JOIN menu_item_variants miv ON miv.id = NEW.variant_id
      WHERE mi.id = NEW.menu_item_id;
      
      -- Check if there's an active ticket for this order on this station
      IF EXISTS (
        SELECT 1 FROM kds_tickets
        WHERE order_id = NEW.order_id AND station_id = v_station.station_id
          AND status IN ('pending', 'preparing')
      ) THEN
        -- Append to existing ticket
        UPDATE kds_tickets
        SET items = items || jsonb_build_array(v_item)
        WHERE order_id = NEW.order_id AND station_id = v_station.station_id
          AND status IN ('pending', 'preparing');
      ELSE
        -- Create a new ticket if none active
        INSERT INTO kds_tickets (order_id, station_id, items, status, priority)
        VALUES (NEW.order_id, v_station.station_id, jsonb_build_array(v_item), 'pending', 0);
      END IF;
      
      -- Update order_item status
      UPDATE order_items
      SET status = 'sent_to_kds',
          kds_station_id = v_station.station_id,
          sent_to_kds_at = NOW()
      WHERE id = NEW.id;
      
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_append_kds_tickets ON order_items;
CREATE TRIGGER trg_append_kds_tickets
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION append_kds_tickets();
