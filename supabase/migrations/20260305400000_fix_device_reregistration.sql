-- Fix device re-registration issues:
-- 1. Staff cannot re-register a device that was approved for a different user
--    (e.g., shift change on shared device)
-- 2. Staff cannot re-register a device that was deleted by admin
--    (admin deletes → staff logs in → new registration → approve fails because
--     pos_terminals still has the fingerprint but is_active=false)

-- ==============================
-- 1. Replace restrictive re-register policy with broader one
-- ==============================

-- Old policy only allows re-registering own rejected devices.
-- New policy allows any staff to re-register any device in their tenant,
-- as long as they set it to pending with their own registered_by.
-- This covers: rejected devices, devices owned by other users (shift changes),
-- and devices at different branches.
DROP POLICY IF EXISTS "registered_devices_reregister_own" ON registered_devices;

CREATE POLICY "registered_devices_reregister_staff" ON registered_devices
  FOR UPDATE
  USING (
    tenant_id = auth_tenant_id()
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
