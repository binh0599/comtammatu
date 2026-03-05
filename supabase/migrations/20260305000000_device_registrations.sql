-- Device registration & approval workflow
-- Replaces manual terminal creation with automatic device registration on login

-- 1. Create registered_devices table
CREATE TABLE registered_devices (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id            BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id            BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  device_fingerprint   TEXT NOT NULL UNIQUE,
  device_name          TEXT NOT NULL DEFAULT '',
  approval_code        TEXT NOT NULL,
  ip_address           TEXT,
  user_agent           TEXT,
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
  registered_by        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  approved_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at          TIMESTAMPTZ,
  rejected_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_registered_devices_tenant ON registered_devices(tenant_id);
CREATE INDEX idx_registered_devices_branch ON registered_devices(branch_id);
CREATE INDEX idx_registered_devices_status ON registered_devices(tenant_id, status);
CREATE INDEX idx_registered_devices_fingerprint ON registered_devices(device_fingerprint);
CREATE INDEX idx_registered_devices_code ON registered_devices(approval_code) WHERE status = 'pending';

-- Auto-update timestamp trigger
CREATE TRIGGER trg_registered_devices_updated_at
  BEFORE UPDATE ON registered_devices
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 2. RLS policies
ALTER TABLE registered_devices ENABLE ROW LEVEL SECURITY;

-- Tenant-wide SELECT for all authenticated staff
CREATE POLICY "registered_devices_select_tenant" ON registered_devices
  FOR SELECT
  USING (tenant_id = auth_tenant_id());

-- INSERT: any authenticated user can register their own device
CREATE POLICY "registered_devices_insert_own" ON registered_devices
  FOR INSERT WITH CHECK (
    registered_by = auth.uid()
    AND tenant_id = auth_tenant_id()
  );

-- UPDATE: only owner/manager can approve/reject
CREATE POLICY "registered_devices_update_manager" ON registered_devices
  FOR UPDATE
  USING (
    tenant_id = auth_tenant_id()
    AND auth_role() IN ('owner', 'manager')
  );

-- 3. Enable realtime for registered_devices so pending approvals show up instantly
ALTER PUBLICATION supabase_realtime ADD TABLE registered_devices;

-- 4. Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON registered_devices TO authenticated;
