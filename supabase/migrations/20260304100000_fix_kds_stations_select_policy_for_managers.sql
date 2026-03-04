-- Owner/manager have branch_id = NULL (they manage ALL branches).
-- The existing SELECT policy only matches a single branch via auth_branch_id(),
-- so owner/manager can never SELECT kds_stations — which also breaks
-- INSERT ... RETURNING (used by Supabase .insert().select()).
--
-- Fix: add a tenant-wide SELECT policy for owner/manager.

CREATE POLICY "kds_stations_select_manager" ON kds_stations
  FOR SELECT
  USING (
    branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('owner', 'manager')
  );
