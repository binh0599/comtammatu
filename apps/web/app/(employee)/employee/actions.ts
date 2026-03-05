"use server";

import "@/lib/server-bootstrap";
import {
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
import { z } from "zod";
import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";

/** Build YYYY-MM-DD from local date (avoids UTC off-by-one from toISOString) */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Validate date range params for queries */
const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
});

/**
 * Shared helper: look up the current user's employee record.
 * Throws on DB/RLS error, returns null if no employee record exists.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findMyEmployee(supabase: any, userId: string, tenantId: number) {
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw safeDbError(error, "db");
  return data as { id: number } | null;
}

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

  const employee = await findMyEmployee(supabase, userId, tenantId);
  if (!employee) return [];

  const today = toLocalDateString(new Date());

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

  const today = toLocalDateString(new Date());

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

// =====================
// Leave requests for current employee
// =====================

async function _getMyLeaveRequests() {
  const { supabase, userId, tenantId } = await getActionContext();

  const employee = await findMyEmployee(supabase, userId, tenantId);
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

  // Compute days server-side from dates (inclusive)
  const start = new Date(parsed.data.start_date + "T00:00:00");
  const end = new Date(parsed.data.end_date + "T00:00:00");
  const diffMs = end.getTime() - start.getTime();
  const computedDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;

  if (computedDays < 1) {
    return { error: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu" };
  }

  const { supabase, userId, tenantId } = await getActionContext();

  const employee = await findMyEmployee(supabase, userId, tenantId);
  if (!employee) {
    return { error: "Không tìm thấy hồ sơ nhân viên" };
  }

  const { error } = await supabase.from("leave_requests").insert({
    employee_id: employee.id,
    type: parsed.data.type,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    days: computedDays,
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

  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("*, branches!inner(name)")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (empError) throw safeDbError(empError, "db");

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

  // Verify current password by re-authenticating
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "Không thể xác thực người dùng" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });

  if (signInError) {
    return { error: "Mật khẩu hiện tại không đúng" };
  }

  // Now update password
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

  const employee = await findMyEmployee(supabase, userId, tenantId);
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

  const today = toLocalDateString(new Date());
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
    // Compare clock_in time with shift start_time
    const shiftStart = todayShift.shifts.start_time as string; // "HH:MM:SS"
    const nowTime = new Date().toLocaleTimeString("en-GB", { hour12: false }); // "HH:MM:SS"
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

  const today = toLocalDateString(new Date());

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
    const nowTime = now.toLocaleTimeString("en-GB", { hour12: false });
    if (nowTime < shiftEnd) {
      status = "early_leave";
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
