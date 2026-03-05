"use server";

import "@/lib/server-bootstrap";
import {
  ActionError,
  getActionContext,
  withServerAction,
  withServerQuery,
  updateMyProfileSchema,
  changePasswordSchema,
  createMyLeaveRequestSchema,
  type UpdateMyProfileInput,
  type ChangePasswordInput,
  type CreateMyLeaveRequestInput,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";

// =====================
// Employee record for current user
// =====================

async function _getMyEmployee() {
  const { supabase, userId, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("employees")
    .select("*, branches!inner(name)")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw safeDbError(error, "db");
  return data;
}

export const getMyEmployee = withServerQuery(_getMyEmployee);

// =====================
// Today's shifts for current employee
// =====================

async function _getMyTodayShifts() {
  const { supabase, userId, tenantId } = await getActionContext();

  // Get employee ID first
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!employee) return [];

  const today = new Date().toISOString().slice(0, 10);

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

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!employee) return null;

  const today = new Date().toISOString().slice(0, 10);

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
  const { supabase, userId, tenantId } = await getActionContext();

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!employee) return [];

  const { data, error } = await supabase
    .from("shift_assignments")
    .select("*, shifts!inner(name, start_time, end_time, branches(name))")
    .eq("employee_id", employee.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")
    .order("shifts(start_time)");

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getMyShiftAssignments = withServerQuery(_getMyShiftAssignments);

// =====================
// Leave requests for current employee
// =====================

async function _getMyLeaveRequests() {
  const { supabase, userId, tenantId } = await getActionContext();

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!employee) return [];

  const { data, error } = await supabase
    .from("leave_requests")
    .select("*, approver:profiles!fk_leave_approver(full_name)")
    .eq("employee_id", employee.id)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getMyLeaveRequests = withServerQuery(_getMyLeaveRequests);

// =====================
// Create leave request (employee self-service)
// =====================

async function _createMyLeaveRequest(data: CreateMyLeaveRequestInput) {
  const parsed = createMyLeaveRequestSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, userId, tenantId } = await getActionContext();

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!employee) {
    return { error: "Không tìm thấy hồ sơ nhân viên" };
  }

  const { error } = await supabase.from("leave_requests").insert({
    employee_id: employee.id,
    type: parsed.data.type,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    days: parsed.data.days,
    reason: parsed.data.reason || null,
    status: "pending",
  });

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/employee/leave");
  return { error: null, success: true };
}

export const createMyLeaveRequest = withServerAction(_createMyLeaveRequest);

// =====================
// Profile: get my profile + employee info
// =====================

async function _getMyProfile() {
  const { supabase, userId, tenantId } = await getActionContext();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, branch_id")
    .eq("id", userId)
    .single();

  if (profileError) throw safeDbError(profileError, "db");

  const { data: employee } = await supabase
    .from("employees")
    .select("*, branches!inner(name)")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return { profile, employee };
}

export const getMyProfile = withServerQuery(_getMyProfile);

// =====================
// Profile: update personal info
// =====================

async function _updateMyProfile(data: UpdateMyProfileInput) {
  const parsed = updateMyProfileSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, userId, tenantId } = await getActionContext();

  // Update profile name
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name })
    .eq("id", userId);

  if (profileError) return safeDbErrorResult(profileError, "db");

  // Update emergency contact on employee record
  if (parsed.data.emergency_contact !== undefined) {
    const { error: empError } = await supabase
      .from("employees")
      .update({ emergency_contact: parsed.data.emergency_contact })
      .eq("profile_id", userId)
      .eq("tenant_id", tenantId);

    if (empError) return safeDbErrorResult(empError, "db");
  }

  revalidatePath("/employee/profile");
  return { error: null, success: true };
}

export const updateMyProfile = withServerAction(_updateMyProfile);

// =====================
// Profile: change password
// =====================

async function _changeMyPassword(data: ChangePasswordInput) {
  const parsed = changePasswordSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null, success: true };
}

export const changeMyPassword = withServerAction(_changeMyPassword);

// =====================
// Leave summary (count used days per type this year)
// =====================

async function _getMyLeaveSummary() {
  const { supabase, userId, tenantId } = await getActionContext();

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!employee) return { annual: 0, sick: 0, unpaid: 0, maternity: 0 };

  const yearStart = new Date().getFullYear() + "-01-01";

  const { data, error } = await supabase
    .from("leave_requests")
    .select("type, days")
    .eq("employee_id", employee.id)
    .eq("status", "approved")
    .gte("start_date", yearStart);

  if (error) throw safeDbError(error, "db");

  const summary = { annual: 0, sick: 0, unpaid: 0, maternity: 0 };
  for (const row of data ?? []) {
    const t = row.type as keyof typeof summary;
    if (t in summary) {
      summary[t] += row.days ?? 0;
    }
  }

  return summary;
}

export const getMyLeaveSummary = withServerQuery(_getMyLeaveSummary);
