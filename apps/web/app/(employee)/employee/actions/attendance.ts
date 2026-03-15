"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";
import { findMyEmployee, todayInTimezone, nowTimeInTimezone } from "./_helpers";

// =====================
// Attendance: clock in
// =====================

async function _clockIn() {
  const { supabase, userId, tenantId, branchId } = await getActionContext();

  if (!branchId) {
    return { error: "Bạn chưa được gán chi nhánh" };
  }

  const employee = await findMyEmployee(supabase, userId, tenantId);
  if (!employee) {
    return { error: "Không tìm thấy hồ sơ nhân viên" };
  }

  const tz = employee.timezone;
  const today = todayInTimezone(tz);
  const now = new Date().toISOString();

  // Check if already clocked in today
  const { data: existing, error: checkError } = await supabase
    .from("attendance_records")
    .select("id, clock_in")
    .eq("employee_id", employee.id)
    .eq("date", today)
    .maybeSingle();

  if (checkError) return safeDbErrorResult(checkError, "db");

  if (existing) {
    return { error: "Bạn đã chấm công vào ca hôm nay rồi" };
  }

  // Determine status by comparing with today's shift
  let status: string = "present";

  const { data: todayShift } = await supabase
    .from("shift_assignments")
    .select("shifts!inner(start_time)")
    .eq("employee_id", employee.id)
    .eq("date", today)
    .limit(1)
    .maybeSingle();

  if (todayShift?.shifts?.start_time) {
    const shiftStart = todayShift.shifts.start_time as string; // "HH:MM:SS"
    const nowTime = nowTimeInTimezone(tz);
    if (nowTime > shiftStart) {
      status = "late";
    }
  }

  const { error } = await supabase.from("attendance_records").insert({
    employee_id: employee.id,
    branch_id: branchId,
    date: today,
    clock_in: now,
    status,
    source: "manual",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Bạn đã chấm công vào ca hôm nay rồi" };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/employee");
  return { error: null, success: true };
}

export const clockIn = withServerAction(_clockIn);

// =====================
// Attendance: clock out
// =====================

async function _clockOut() {
  const { supabase, userId, tenantId } = await getActionContext();

  const employee = await findMyEmployee(supabase, userId, tenantId);
  if (!employee) {
    return { error: "Không tìm thấy hồ sơ nhân viên" };
  }

  const tz = employee.timezone;
  const today = todayInTimezone(tz);

  // Get today's attendance record
  const { data: record, error: fetchError } = await supabase
    .from("attendance_records")
    .select("id, clock_in, clock_out")
    .eq("employee_id", employee.id)
    .eq("date", today)
    .maybeSingle();

  if (fetchError) return safeDbErrorResult(fetchError, "db");

  if (!record) {
    return { error: "Bạn chưa chấm công vào ca hôm nay" };
  }

  if (record.clock_out) {
    return { error: "Bạn đã chấm công ra ca hôm nay rồi" };
  }

  const now = new Date();
  const clockOutTime = now.toISOString();

  // Compute hours_worked
  let hoursWorked: number | null = null;
  if (record.clock_in) {
    const clockInDate = new Date(record.clock_in);
    const diffMs = now.getTime() - clockInDate.getTime();
    hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
  }

  // Check for early leave by comparing with shift end_time
  let status: string | undefined;

  const { data: todayShift } = await supabase
    .from("shift_assignments")
    .select("shifts!inner(end_time)")
    .eq("employee_id", employee.id)
    .eq("date", today)
    .limit(1)
    .maybeSingle();

  if (todayShift?.shifts?.end_time) {
    const shiftEnd = todayShift.shifts.end_time as string; // "HH:MM:SS"
    const nowTime = nowTimeInTimezone(tz);
    if (nowTime < shiftEnd) {
      status = "early_leave";
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic payload shape depends on which fields are being updated
  const updatePayload: Record<string, any> = {
    clock_out: clockOutTime,
    hours_worked: hoursWorked,
  };
  if (status) {
    updatePayload.status = status;
  }

  const { error } = await supabase
    .from("attendance_records")
    .update(updatePayload)
    .eq("id", record.id);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/employee");
  return { error: null, success: true };
}

export const clockOut = withServerAction(_clockOut);
