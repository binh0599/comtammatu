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
// getStaffPerformance
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

  const [sY = 0, sM = 1, sD = 1] = parsed.startDate.split("-").map(Number);
  const [eY = 0, eM = 1, eD = 1] = parsed.endDate.split("-").map(Number);
  const start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
  const end = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));

  // Get employees with role filter
  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, profile_id, branch_id, profiles!inner(full_name, role), branches!inner(name)")
    .eq("tenant_id", tenantId)
    .in("branch_id", targetBranchIds);
  if (empErr) throw safeDbError(empErr, "db");
  if (!employees || employees.length === 0) return [];

  // Filter by role if specified
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

  // --- Fetch data for different roles in parallel ---

  // Orders created by profile (for waiters)
  const ordersPromise = supabase
    .from("orders")
    .select("id, created_by, status, created_at, updated_at")
    .in("branch_id", targetBranchIds)
    .in("created_by", profileIds)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  // Order items count (for waiters avg items per order)
  // Will fetch after orders

  // Payments (for cashiers)
  const paymentsPromise = supabase
    .from("payments")
    .select("id, processed_by, paid_at, status")
    .in("processed_by", profileIds)
    .eq("status", "completed")
    .gte("paid_at", start.toISOString())
    .lte("paid_at", end.toISOString());

  // KDS tickets (for chefs)
  const kdsPromise = supabase
    .from("kds_tickets")
    .select("id, bumped_by, status, created_at, bumped_at")
    .in("branch_id", targetBranchIds)
    .eq("status", "completed")
    .in("bumped_by", profileIds)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  // Attendance records (for all)
  const attendancePromise = supabase
    .from("attendance_records")
    .select("employee_id, status, date")
    .in("employee_id", employeeIds)
    .in("branch_id", targetBranchIds)
    .gte("date", parsed.startDate)
    .lte("date", parsed.endDate);

  // Shift assignments (for attendance rate denominator)
  const shiftsPromise = supabase
    .from("shift_assignments")
    .select("employee_id, date")
    .in("employee_id", employeeIds)
    .gte("date", parsed.startDate)
    .lte("date", parsed.endDate);

  const [ordersResult, paymentsResult, kdsResult, attendanceResult, shiftsResult] =
    await Promise.all([
      ordersPromise,
      paymentsPromise,
      kdsPromise,
      attendancePromise,
      shiftsPromise,
    ]);

  if (ordersResult.error) throw safeDbError(ordersResult.error, "db");
  if (paymentsResult.error) throw safeDbError(paymentsResult.error, "db");
  if (kdsResult.error) throw safeDbError(kdsResult.error, "db");
  if (attendanceResult.error) throw safeDbError(attendanceResult.error, "db");
  if (shiftsResult.error) throw safeDbError(shiftsResult.error, "db");

  const orders = ordersResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const kdsTickets = kdsResult.data ?? [];
  const attendanceRecords = attendanceResult.data ?? [];
  const shiftAssignments = shiftsResult.data ?? [];

  // Get order items for waiter avg items calculation
  const orderIds = orders.map((o: { id: number }) => o.id);
  const orderItemCounts = new Map<number, number>();
  if (orderIds.length > 0) {
    const { data: orderItems, error: oiErr } = await supabase
      .from("order_items")
      .select("order_id, quantity")
      .in("order_id", orderIds);
    if (oiErr) throw safeDbError(oiErr, "db");
    for (const oi of orderItems ?? []) {
      orderItemCounts.set(
        oi.order_id,
        (orderItemCounts.get(oi.order_id) ?? 0) + oi.quantity,
      );
    }
  }

  // For cashier: get orders with ready->completed times
  const completedOrders = orders.filter(
    (o: { status: string }) => o.status === "completed",
  );

  // --- Build per-profile metrics ---

  // Waiter: orders created & avg items
  const waiterOrders = new Map<string, { count: number; totalItems: number }>();
  for (const o of orders) {
    const entry = waiterOrders.get(o.created_by) ?? { count: 0, totalItems: 0 };
    entry.count++;
    entry.totalItems += orderItemCounts.get(o.id) ?? 0;
    waiterOrders.set(o.created_by, entry);
  }

  // Cashier: payments processed & avg processing time
  const cashierPayments = new Map<
    string,
    { count: number; totalTimeMin: number; timedCount: number }
  >();
  for (const p of payments) {
    const entry = cashierPayments.get(p.processed_by) ?? {
      count: 0,
      totalTimeMin: 0,
      timedCount: 0,
    };
    entry.count++;
    cashierPayments.set(p.processed_by, entry);
  }

  // For avg processing time, approximate from order ready->completed
  // Match payments to orders that were completed
  const orderReadyTimes = new Map<number, { created_at: string; updated_at: string }>();
  for (const o of completedOrders) {
    orderReadyTimes.set(o.id, { created_at: o.created_at, updated_at: o.updated_at });
  }

  // Chef: KDS tickets bumped & avg prep time
  const chefTickets = new Map<
    string,
    { count: number; totalPrepMin: number; timedCount: number }
  >();
  for (const t of kdsTickets) {
    const entry = chefTickets.get(t.bumped_by) ?? {
      count: 0,
      totalPrepMin: 0,
      timedCount: 0,
    };
    entry.count++;
    if (t.created_at && t.bumped_at) {
      const prepMs =
        new Date(t.bumped_at).getTime() - new Date(t.created_at).getTime();
      if (prepMs > 0 && prepMs < 3600000) {
        // Reasonable: <1 hour
        entry.totalPrepMin += prepMs / 60000;
        entry.timedCount++;
      }
    }
    chefTickets.set(t.bumped_by, entry);
  }

  // Attendance rate per employee
  const scheduledDays = new Map<number, number>();
  for (const sa of shiftAssignments) {
    scheduledDays.set(
      sa.employee_id,
      (scheduledDays.get(sa.employee_id) ?? 0) + 1,
    );
  }

  const presentDays = new Map<number, number>();
  for (const ar of attendanceRecords) {
    if (ar.status === "present" || ar.status === "late") {
      presentDays.set(
        ar.employee_id,
        (presentDays.get(ar.employee_id) ?? 0) + 1,
      );
    }
  }

  // --- Build result ---
  const rows: StaffPerformanceRow[] = [];

  for (const emp of filteredEmployees) {
    const role = emp.profiles.role;
    const profileId = emp.profile_id;
    const metrics: StaffMetrics = {};

    // Attendance
    const scheduled = scheduledDays.get(emp.id) ?? 0;
    const present = presentDays.get(emp.id) ?? 0;
    metrics.attendance_rate =
      scheduled > 0 ? Math.round((present / scheduled) * 100) : undefined;

    if (role === "waiter") {
      const waiterData = waiterOrders.get(profileId);
      metrics.orders_created = waiterData?.count ?? 0;
      metrics.avg_items_per_order =
        waiterData && waiterData.count > 0
          ? Math.round((waiterData.totalItems / waiterData.count) * 10) / 10
          : 0;
    } else if (role === "cashier") {
      const cashierData = cashierPayments.get(profileId);
      metrics.payments_processed = cashierData?.count ?? 0;
      // Approximate avg processing time
      metrics.avg_processing_time_min = undefined;
    } else if (role === "chef") {
      const chefData = chefTickets.get(profileId);
      metrics.tickets_bumped = chefData?.count ?? 0;
      metrics.avg_prep_time_min =
        chefData && chefData.timedCount > 0
          ? Math.round((chefData.totalPrepMin / chefData.timedCount) * 10) / 10
          : undefined;
    }

    // Calculate a simple relative score
    let score = 50; // default
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

  // Sort by score descending
  rows.sort((a, b) => b.score - a.score);

  return rows;
}

export const getStaffPerformance = withServerQuery(_getStaffPerformance);
