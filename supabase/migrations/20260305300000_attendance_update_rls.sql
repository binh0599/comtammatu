-- Migration: Add RLS UPDATE policy for attendance_records
-- Allows employees to update their own attendance record (clock_out)
-- and HR/manager/owner to update any record in the tenant.

-- Employee can update their own record (same branch)
CREATE POLICY "attendance_update_own" ON attendance_records FOR UPDATE
  USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND branch_id = auth_branch_id()
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND branch_id = auth_branch_id()
  );

-- HR / manager / owner can update any record in their tenant's branches
CREATE POLICY "attendance_update_hr" ON attendance_records FOR UPDATE
  USING (
    branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('hr', 'manager', 'owner')
  )
  WITH CHECK (
    branch_id IN (SELECT id FROM branches WHERE tenant_id = auth_tenant_id())
    AND auth_role() IN ('hr', 'manager', 'owner')
  );
