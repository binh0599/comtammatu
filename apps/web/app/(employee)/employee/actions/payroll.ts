"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerQuery,
  safeDbError,
} from "@comtammatu/shared";
import { findMyEmployee } from "./_helpers";

// =====================
// Payroll: my pay stubs
// =====================

async function _getMyPayrollEntries() {
  const { supabase, userId, tenantId } = await getActionContext();

  const employee = await findMyEmployee(supabase, userId, tenantId);
  if (!employee) return [];

  const { data, error } = await supabase
    .from("payroll_entries")
    .select(
      "*, payroll_periods!inner(name, start_date, end_date, status, branches(name))"
    )
    .eq("employee_id", employee.id)
    .eq("tenant_id", tenantId)
    .in("payroll_periods.status", ["approved", "paid"])
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getMyPayrollEntries = withServerQuery(_getMyPayrollEntries);
