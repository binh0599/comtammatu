-- Migration: Add RLS UPDATE policy for attendance_records
-- Allows employees to update only their currently open attendance record (clock_out)
-- and HR/manager/owner to update any record in the tenant.

-- Employee can update only their own OPEN record (clock_out IS NULL) in same branch
CREATE POLICY "attendance_update_own" ON attendance_records FOR UPDATE
  USING (
    employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
    AND branch_id = auth_branch_id()
    AND clock_out IS NULL
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

-- Trigger: prevent modification of immutable fields on closed attendance records.
-- Once clock_out is set, employee_id, branch_id, date, clock_in, and source cannot change.
CREATE OR REPLACE FUNCTION enforce_immutable_attendance_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce on records that were already closed (had clock_out before this update)
  IF OLD.clock_out IS NOT NULL THEN
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id
      OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
      OR NEW.date IS DISTINCT FROM OLD.date
      OR NEW.clock_in IS DISTINCT FROM OLD.clock_in
      OR NEW.source IS DISTINCT FROM OLD.source
    THEN
      RAISE EXCEPTION 'Cannot modify immutable fields on a closed attendance record';
    END IF;
  END IF;

  -- On open records being closed, protect clock_in from changing
  IF OLD.clock_out IS NULL AND NEW.clock_in IS DISTINCT FROM OLD.clock_in THEN
    RAISE EXCEPTION 'Cannot modify clock_in time on an attendance record';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_immutable_attendance
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION enforce_immutable_attendance_fields();
