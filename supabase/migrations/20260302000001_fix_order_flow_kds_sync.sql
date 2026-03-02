-- ============================================
-- Fix Order Flow: KDS → Order Status Sync
--
-- Problems fixed:
-- 1. Order stays at 'confirmed' when chef starts cooking
--    → Now syncs to 'preparing' when first ticket bumped
-- 2. Order jumps confirmed → ready (skipping preparing)
--    → Now properly transitions through preparing → ready
-- ============================================

CREATE OR REPLACE FUNCTION update_order_from_kds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. When a ticket transitions to 'preparing':
  --    Set order to 'preparing' if currently 'confirmed'
  IF NEW.status = 'preparing' AND OLD.status = 'pending' THEN
    UPDATE orders
    SET status = 'preparing',
        updated_at = NOW()
    WHERE id = NEW.order_id
      AND status = 'confirmed';
  END IF;

  -- 2. When a ticket transitions to 'ready':
  --    If ALL tickets for this order are 'ready', set order to 'ready'
  IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
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
        AND status IN ('confirmed', 'preparing');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists (trg_update_order_from_kds), function is replaced in-place.
-- No need to DROP/CREATE trigger — it references the function by name.
