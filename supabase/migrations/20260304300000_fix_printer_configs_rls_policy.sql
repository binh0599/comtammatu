-- ============================================================
-- Fix printer_configs RLS policy
-- ============================================================
-- The original policy used `profiles.branch_id` which only matches the
-- user's own branch. Owner/manager users need tenant-wide access (all
-- branches), matching the pattern used by pos_terminals, kds_stations,
-- branch_zones, etc.
-- ============================================================

-- Drop the incorrect policy
DROP POLICY IF EXISTS "printer_configs_branch_isolation" ON printer_configs;

-- 1) Tenant-wide SELECT for all authenticated staff
CREATE POLICY "printer_configs_select_tenant" ON printer_configs
  FOR SELECT
  USING (
    branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
  );

-- 2) Full access for owner/manager across all tenant branches
CREATE POLICY "printer_configs_all_manager" ON printer_configs
  FOR ALL
  USING (
    branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager')
  );
