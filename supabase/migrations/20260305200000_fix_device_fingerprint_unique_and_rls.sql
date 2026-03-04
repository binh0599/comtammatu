-- Fix device registration bugs:
-- 1. UNIQUE(device_fingerprint) is global — should be per-tenant
-- 2. Staff cannot re-register rejected devices (missing UPDATE RLS for own rejected devices)

-- ==============================
-- 1. Fix UNIQUE constraint: global → per-tenant
-- ==============================

-- Drop the global unique index
ALTER TABLE registered_devices DROP CONSTRAINT IF EXISTS registered_devices_device_fingerprint_key;
DROP INDEX IF EXISTS idx_registered_devices_fingerprint;

-- Create composite unique: same fingerprint allowed across different tenants
CREATE UNIQUE INDEX uq_registered_devices_fingerprint_tenant
  ON registered_devices(device_fingerprint, tenant_id);

-- ==============================
-- 2. Add RLS: staff can re-register their own rejected device
-- ==============================

-- Allow the registrant to UPDATE their own rejected device back to pending
-- WITH CHECK ensures they can only set it back to 'pending' with clean approval fields
CREATE POLICY "registered_devices_reregister_own" ON registered_devices
  FOR UPDATE
  USING (
    registered_by = auth.uid()
    AND tenant_id = auth_tenant_id()
    AND status = 'rejected'
  )
  WITH CHECK (
    status = 'pending'
    AND approved_by IS NULL
    AND approved_at IS NULL
    AND rejected_at IS NULL
  );
