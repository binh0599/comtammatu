-- Fix RLS policies for registered_devices
-- 1. Add branch isolation to SELECT (staff only see own branch)
-- 2. Constrain INSERT to prevent self-approval
-- 3. Add DELETE policy + grant for managers/owners

-- Drop existing policies
DROP POLICY IF EXISTS "registered_devices_select_tenant" ON registered_devices;
DROP POLICY IF EXISTS "registered_devices_insert_own" ON registered_devices;
DROP POLICY IF EXISTS "registered_devices_update_manager" ON registered_devices;

-- SELECT: staff see devices in their own branch; owner/manager see all in tenant
CREATE POLICY "registered_devices_select" ON registered_devices
  FOR SELECT
  USING (
    tenant_id = auth_tenant_id()
    AND (
      -- Owner/manager can see all devices in tenant
      auth_role() IN ('owner', 'manager')
      -- Staff can only see their own device registrations
      OR registered_by = auth.uid()
    )
  );

-- INSERT: user can register own device with status='pending' and no approval fields
CREATE POLICY "registered_devices_insert_own" ON registered_devices
  FOR INSERT WITH CHECK (
    registered_by = auth.uid()
    AND tenant_id = auth_tenant_id()
    AND status = 'pending'
    AND approved_by IS NULL
    AND approved_at IS NULL
    AND rejected_at IS NULL
  );

-- UPDATE: only owner/manager can approve/reject (within same tenant)
CREATE POLICY "registered_devices_update_manager" ON registered_devices
  FOR UPDATE
  USING (
    tenant_id = auth_tenant_id()
    AND auth_role() IN ('owner', 'manager')
  );

-- DELETE: only owner/manager can delete devices (within same tenant)
CREATE POLICY "registered_devices_delete_manager" ON registered_devices
  FOR DELETE
  USING (
    tenant_id = auth_tenant_id()
    AND auth_role() IN ('owner', 'manager')
  );

-- Grant DELETE to authenticated users (RLS will enforce role check)
GRANT DELETE ON registered_devices TO authenticated;
