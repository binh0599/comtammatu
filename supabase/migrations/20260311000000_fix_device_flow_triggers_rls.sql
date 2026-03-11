-- Fix triggers, RLS policies, and re-registration security for unified device flow
-- Context: Migration 20260306000000 made terminal_id nullable on orders/sessions/payments
-- but the BEFORE INSERT triggers and RLS policies still require a valid pos_terminal reference.

-- ============================================================
-- 1. Update triggers to allow NULL terminal_id (unified device flow)
-- ============================================================

CREATE OR REPLACE FUNCTION check_cashier_station_session()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Allow NULL terminal_id for unified device flow (device verified at app layer)
  IF NEW.terminal_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pos_terminals
    WHERE id = NEW.terminal_id AND type = 'cashier_station'
  ) THEN
    RAISE EXCEPTION 'Only cashier_station terminals can open POS sessions';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_cashier_station_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Allow NULL terminal_id for unified device flow (device verified at app layer)
  IF NEW.terminal_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pos_terminals
    WHERE id = NEW.terminal_id AND type = 'cashier_station'
  ) THEN
    RAISE EXCEPTION 'Only cashier_station terminals can process payments';
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Update payments INSERT RLS policy to allow NULL terminal_id
-- ============================================================

DROP POLICY IF EXISTS "payments_insert_cashier" ON payments;

CREATE POLICY "payments_insert_cashier" ON payments FOR INSERT WITH CHECK (
  auth_role() IN ('cashier', 'manager', 'owner')
  AND (
    terminal_id IS NULL
    OR EXISTS (
      SELECT 1 FROM pos_terminals WHERE id = terminal_id AND type = 'cashier_station'
    )
  )
);

-- ============================================================
-- 3. Tighten re-registration RLS policy (prevent device hijacking)
--    Old: USING(tenant_id = auth_tenant_id()) — any staff can target any device
--    New: Only own devices OR non-approved devices can be re-registered
-- ============================================================

DROP POLICY IF EXISTS "registered_devices_reregister_staff" ON registered_devices;

CREATE POLICY "registered_devices_reregister_staff" ON registered_devices
  FOR UPDATE
  USING (
    tenant_id = auth_tenant_id()
    AND (
      registered_by = auth.uid()
      OR status IN ('pending', 'rejected')
    )
  )
  WITH CHECK (
    status = 'pending'
    AND registered_by = auth.uid()
    AND approved_by IS NULL
    AND approved_at IS NULL
    AND rejected_at IS NULL
    AND linked_terminal_id IS NULL
    AND linked_station_id IS NULL
    AND tenant_id = auth_tenant_id()
  );
