"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerQuery,
  dateRangeSchema,
  safeDbError,
} from "@comtammatu/shared";
import { findMyEmployee, todayInTimezone } from "./_helpers";

// =====================
// Today's shifts for current employee
// =====================

async function _getMyTodayShifts() {
  const { supabase, userId, tenantId } = await getActionContext();

  const employee = await findMyEmployee(supabase, userId, tenantId);
  if (!employee) return [];

  const today = todayInTimezone(employee.timezone);

  const { data, error } = await supabase
    .from("shift_assignments")
    .select("*, shifts!inner(name, start_time, end_time, branches(name))")
    .eq("employee_id", employee.id)
    .eq("date", today)
    .order("shifts(start_time)");

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getMyTodayShifts = withServerQuery(_getMyTodayShifts);

// =====================
// Today's attendance for current employee
// =====================

async function _getMyTodayAttendance() {
  const { supabase, userId, tenantId } = await getActionContext();

  const employee = await findMyEmployee(supabase, userId, tenantId);
  if (!employee) return null;

  const today = todayInTimezone(employee.timezone);

  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employee.id)
    .eq("date", today)
    .maybeSingle();

  if (error) throw safeDbError(error, "db");
  return data;
}

export const getMyTodayAttendance = withServerQuery(_getMyTodayAttendance);

// =====================
// Shift assignments for date range (calendar view)
// =====================

async function _getMyShiftAssignments(startDate: string, endDate: string) {
  const parsed = dateRangeSchema.safeParse({ startDate, endDate });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ngày không hợp lệ");
  }

  const { supabase, userId, tenantId } = await getActionContext();

  const employee = await findMyEmployee(supabase, userId, tenantId);
  if (!employee) return [];

  const { data, error } = await supabase
    .from("shift_assignments")
    .select("*, shifts!inner(name, start_time, end_time, branches(name))")
    .eq("employee_id", employee.id)
    .gte("date", parsed.data.startDate)
    .lte("date", parsed.data.endDate)
    .order("date")
    .order("shifts(start_time)");

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getMyShiftAssignments = withServerQuery(_getMyShiftAssignments);
