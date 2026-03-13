"use server";

import "@/lib/server-bootstrap";
import {
  getAdminContext,
  getBranchIdsForTenant,
  withServerQuery,
  safeDbError,
  HR_ROLES,
  staffPerformanceQuerySchema,
} from "@comtammatu/shared";

// =====================
// Types
// =====================

export interface StaffMetrics {
  // Waiter metrics
  orders_created?: number;
  avg_items_per_order?: number;
  // Cashier metrics
  payments_processed?: number;
  avg_processing_time_min?: number;
  // Chef metrics
  tickets_bumped?: number;
  avg_prep_time_min?: number;
  // Common
  attendance_rate?: number; // 0-100
}

export interface StaffPerformanceRow {
  employee_id: number;
  name: string;
  role: string;
  branch_name: string;
  metrics: StaffMetrics;
  score: number; // 0-100 relative performance
}

// =====================
// getStaffPerformance — Now reads from materialized view + attendance tables
// =====================

async function _getStaffPerformance(
  startDate: string,
  endDate: string,
  branch_id?: number,
  role?: string,
): Promise<StaffPerformanceRow[]> {
  const parsed = staffPerformanceQuerySchema.parse({
    startDate,
    endDate,
    branch_id,
    role,
  });
  const { supabase, tenantId } = await getAdminContext(HR_ROLES);

  let targetBranchIds: number[];
  if (parsed.branch_id) {
    const allBranchIds = await getBranchIdsForTenant(supabase, tenantId);
    if (!allBranchIds.includes(parsed.branch_id)) return [];
    targetBranchIds = [parsed.branch_id];
  } else {
    targetBranchIds = await getBranchIdsForTenant(supabase, tenantId);
  }
  if (targetBranchIds.length === 0) return [];

  // Get employees with role filter
  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, profile_id, branch_id, profiles!inner(full_name, role), branches!inner(name)")
    .eq("tenant_id", tenantId)
    .in("branch_id", targetBranchIds);
  if (empErr) throw safeDbError(empErr, "db");
  if (!employees || employees.length === 0) return [];

  type EmployeeRow = {
    id: number;
    profile_id: string;
    branch_id: number;
    profiles: { full_name: string; role: string };
    branches: { name: string };
  };

  let filteredEmployees = (employees as unknown as EmployeeRow[]).filter(
    (e) => ["waiter", "cashier", "chef"].includes(e.profiles.role),
  );

  if (parsed.role) {
    filteredEmployees = filteredEmployees.filter(
      (e) => e.profiles.role === parsed.role,
    );
  }

  if (filteredEmployees.length === 0) return [];

  const profileIds = filteredEmployees.map((e) => e.profile_id);
  const employeeIds = filteredEmployees.map((e) => e.id);

  // --- Fetch from MV + attendance tables in parallel ---
  const [perfResult, attendanceResult, shiftsResult] = await Promise.all([
    // Performance from MV (waiter orders, cashier payments)
    supabase
      .from("mv_staff_performance")
      .select("profile_id, orders_created, total_items_served, payments_processed")
      .in("profile_id", profileIds)
      .gte("report_date", parsed.startDate)
      .lte("report_date", parsed.endDate),

    // Attendance records (still raw — small table, fast query)
    supabase
      .from("attendance_records")
      .select("employee_id, status")
      .in("employee_id", employeeIds)
      .in("branch_id", targetBranchIds)
      .gte("date", parsed.startDate)
      .lte("date", parsed.endDate),

    // Shift assignments (denominator for attendance rate)
    supabase
      .from("shift_assignments")
      .select("employee_id")
      .in("employee_id", employeeIds)
      .gte("date", parsed.startDate)
      .lte("date", parsed.endDate),
  ]);

  if (perfResult.error) throw safeDbError(perfResult.error, "db");
  if (attendanceResult.error) throw safeDbError(attendanceResult.error, "db");
  if (shiftsResult.error) throw safeDbError(shiftsResult.error, "db");

  // Aggregate MV rows per profile (sum across days)
  const perfMap = new Map<
    string,
    {
      orders_created: number;
      total_items: number;
      payments_processed: number;
    }
  >();

  for (const row of perfResult.data ?? []) {
    if (!row.profile_id) continue;
    const existing = perfMap.get(row.profile_id) ?? {
      orders_created: 0,
      total_items: 0,
      payments_processed: 0,
    };
    existing.orders_created += Number(row.orders_created);
    existing.total_items += Number(row.total_items_served);
    existing.payments_processed += Number(row.payments_processed);
    perfMap.set(row.profile_id, existing);
  }

  // Attendance rate per employee
  const scheduledDays = new Map<number, number>();
  for (const sa of shiftsResult.data ?? []) {
    scheduledDays.set(sa.employee_id, (scheduledDays.get(sa.employee_id) ?? 0) + 1);
  }

  const presentDays = new Map<number, number>();
  for (const ar of attendanceResult.data ?? []) {
    if (ar.status === "present" || ar.status === "late") {
      presentDays.set(ar.employee_id, (presentDays.get(ar.employee_id) ?? 0) + 1);
    }
  }

  // --- Build result ---
  const rows: StaffPerformanceRow[] = [];

  for (const emp of filteredEmployees) {
    const role = emp.profiles.role;
    const profileId = emp.profile_id;
    const perf = perfMap.get(profileId);
    const metrics: StaffMetrics = {};

    // Attendance
    const scheduled = scheduledDays.get(emp.id) ?? 0;
    const present = presentDays.get(emp.id) ?? 0;
    metrics.attendance_rate =
      scheduled > 0 ? Math.round((present / scheduled) * 100) : undefined;

    if (role === "waiter") {
      metrics.orders_created = perf?.orders_created ?? 0;
      metrics.avg_items_per_order =
        perf && perf.orders_created > 0
          ? Math.round((perf.total_items / perf.orders_created) * 10) / 10
          : 0;
    } else if (role === "cashier") {
      metrics.payments_processed = perf?.payments_processed ?? 0;
      metrics.avg_processing_time_min = undefined;
    } else if (role === "chef") {
      // Chef per-person attribution not available (kds_tickets lacks bumped_by)
      // Show waiter-equivalent metrics if chef also creates orders
      metrics.tickets_bumped = undefined;
      metrics.avg_prep_time_min = undefined;
    }

    // Calculate a simple relative score
    let score = 50;
    if (role === "waiter" && metrics.orders_created !== undefined) {
      score = Math.min(100, metrics.orders_created * 2);
    } else if (role === "cashier" && metrics.payments_processed !== undefined) {
      score = Math.min(100, metrics.payments_processed * 2);
    } else if (role === "chef" && metrics.tickets_bumped !== undefined) {
      score = Math.min(100, metrics.tickets_bumped * 2);
    }
    if (metrics.attendance_rate !== undefined) {
      score = Math.round((score + metrics.attendance_rate) / 2);
    }

    rows.push({
      employee_id: emp.id,
      name: emp.profiles.full_name,
      role,
      branch_name: emp.branches.name,
      metrics,
      score,
    });
  }

  rows.sort((a, b) => b.score - a.score);

  return rows;
}

export const getStaffPerformance = withServerQuery(_getStaffPerformance);
