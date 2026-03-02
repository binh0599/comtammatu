"use server";

import "@/lib/server-bootstrap";
import {
  ActionError,
  getActionContext,
  withServerAction,
  withServerQuery,
  createStaffAccountSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  createShiftSchema,
  createShiftAssignmentSchema,
  createLeaveRequestSchema,
  approveLeaveRequestSchema,
  type CreateStaffAccountInput,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
  type CreateShiftAssignmentInput,
  type CreateLeaveRequestInput,
  type ApproveLeaveRequestInput,
} from "@comtammatu/shared";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Roles that each role is permitted to create
const CREATABLE_ROLES: Record<string, string[]> = {
  owner: ["manager", "hr", "cashier", "waiter", "chef"],
  manager: ["cashier", "waiter", "chef"],
  hr: ["cashier", "waiter", "chef"],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBranchesInternal(supabase: any, tenantId: number) {
  const { data } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");
  return data ?? [];
}

// =====================
// Branches (for selectors)
// =====================

async function _getBranchesForHr() {
  const { supabase, tenantId } = await getActionContext();
  return getBranchesInternal(supabase, tenantId);
}

export const getBranchesForHr = withServerQuery(_getBranchesForHr);

// =====================
// Employees
// =====================

async function _getEmployees() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("employees")
    .select("*, profiles!inner(full_name, id, role), branches!inner(name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getEmployees = withServerQuery(_getEmployees);

async function _getCreatableRoles(): Promise<string[]> {
  const { userRole } = await getActionContext();
  return CREATABLE_ROLES[userRole] ?? [];
}

export const getCreatableRoles = withServerQuery(_getCreatableRoles);

async function _createStaffAccount(data: CreateStaffAccountInput) {
  const parsed = createStaffAccountSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userRole } = await getActionContext();

  const allowedRoles = CREATABLE_ROLES[userRole] ?? [];
  if (!allowedRoles.includes(parsed.data.role)) {
    return { error: "Bạn không có quyền tạo tài khoản với vai trò này" };
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: newUser, error: createError } =
    await adminClient.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.full_name,
        tenant_id: tenantId,
        role: parsed.data.role,
      },
    });

  if (createError) {
    if (createError.message.includes("already registered")) {
      return { error: "Email này đã được sử dụng" };
    }
    return { error: createError.message };
  }

  const newUserId = newUser.user.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ branch_id: parsed.data.branch_id })
    .eq("id", newUserId);

  if (profileError) {
    console.error("Failed to set branch_id on profile:", profileError.message);
  }

  const { error: empError } = await supabase.from("employees").insert({
    tenant_id: tenantId,
    profile_id: newUserId,
    branch_id: parsed.data.branch_id,
    position: parsed.data.position,
    department: parsed.data.department || null,
    hire_date: parsed.data.hire_date,
    employment_type: parsed.data.employment_type,
    hourly_rate: parsed.data.hourly_rate ?? null,
    monthly_salary: parsed.data.monthly_salary ?? null,
    status: "active",
  });

  if (empError) return { error: empError.message };

  revalidatePath("/admin/hr");
  return { success: true };
}

export const createStaffAccount = withServerAction(_createStaffAccount);

async function _createEmployee(data: CreateEmployeeInput) {
  const parsed = createEmployeeSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase.from("employees").insert({
    tenant_id: tenantId,
    profile_id: parsed.data.profile_id,
    branch_id: parsed.data.branch_id,
    position: parsed.data.position,
    department: parsed.data.department || null,
    hire_date: parsed.data.hire_date,
    employment_type: parsed.data.employment_type,
    hourly_rate: parsed.data.hourly_rate ?? null,
    monthly_salary: parsed.data.monthly_salary ?? null,
    emergency_contact: parsed.data.emergency_contact ?? null,
    status: "active",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Nhân viên này đã tồn tại trong hệ thống" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/hr");
  return { success: true };
}

export const createEmployee = withServerAction(_createEmployee);

async function _updateEmployee(id: number, data: UpdateEmployeeInput) {
  const parsed = updateEmployeeSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {};
  if (parsed.data.position !== undefined) payload.position = parsed.data.position;
  if (parsed.data.department !== undefined) payload.department = parsed.data.department || null;
  if (parsed.data.branch_id !== undefined) payload.branch_id = parsed.data.branch_id;
  if (parsed.data.employment_type !== undefined) payload.employment_type = parsed.data.employment_type;
  if (parsed.data.hourly_rate !== undefined) payload.hourly_rate = parsed.data.hourly_rate ?? null;
  if (parsed.data.monthly_salary !== undefined) payload.monthly_salary = parsed.data.monthly_salary ?? null;
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;
  if (parsed.data.emergency_contact !== undefined) payload.emergency_contact = parsed.data.emergency_contact ?? null;

  const { error } = await supabase
    .from("employees")
    .update(payload)
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/hr");
  return { success: true };
}

export const updateEmployee = withServerAction(_updateEmployee);

// =====================
// Shifts
// =====================

async function _getShifts() {
  const { supabase, tenantId } = await getActionContext();

  const branchList = await getBranchesInternal(supabase, tenantId);
  const branchIds = branchList.map((b: { id: number }) => b.id);

  if (branchIds.length === 0) return [];

  const { data, error } = await supabase
    .from("shifts")
    .select("*, branches!inner(name)")
    .in("branch_id", branchIds)
    .order("name");

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getShifts = withServerQuery(_getShifts);

async function _createShift(formData: FormData) {
  const parsed = createShiftSchema.safeParse({
    branch_id: formData.get("branch_id"),
    name: formData.get("name"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    break_min: formData.get("break_min") || undefined,
    max_employees: formData.get("max_employees") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase } = await getActionContext();

  const { error } = await supabase.from("shifts").insert({
    branch_id: parsed.data.branch_id,
    name: parsed.data.name,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
    break_min: parsed.data.break_min ?? null,
    max_employees: parsed.data.max_employees ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/hr");
  return { success: true };
}

export const createShift = withServerAction(_createShift);

async function _deleteShift(id: number) {
  const { supabase } = await getActionContext();

  const { error } = await supabase.from("shifts").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/hr");
  return { success: true };
}

export const deleteShift = withServerAction(_deleteShift);

// =====================
// Shift Assignments (Schedule)
// =====================

async function _getShiftAssignments(startDate: string, endDate: string) {
  const { supabase, tenantId } = await getActionContext();

  const branchList = await getBranchesInternal(supabase, tenantId);
  const branchIds = branchList.map((b: { id: number }) => b.id);

  if (branchIds.length === 0) return [];

  const { data, error } = await supabase
    .from("shift_assignments")
    .select(
      "*, employees!inner(id, profile_id, profiles(full_name)), shifts!inner(name, start_time, end_time, branch_id, branches(name))"
    )
    .in("shifts.branch_id", branchIds)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")
    .order("shifts(start_time)");

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getShiftAssignments = withServerQuery(_getShiftAssignments);

async function _createShiftAssignment(data: CreateShiftAssignmentInput) {
  const parsed = createShiftAssignmentSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase } = await getActionContext();

  const { error } = await supabase.from("shift_assignments").insert({
    shift_id: parsed.data.shift_id,
    employee_id: parsed.data.employee_id,
    date: parsed.data.date,
    notes: parsed.data.notes || null,
    status: "scheduled",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Nhân viên này đã được phân ca này trong ngày" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/hr");
  return { success: true };
}

export const createShiftAssignment = withServerAction(_createShiftAssignment);

// =====================
// Attendance
// =====================

async function _getAttendanceRecords(date: string) {
  const { supabase, tenantId } = await getActionContext();

  const branchList = await getBranchesInternal(supabase, tenantId);
  const branchIds = branchList.map((b: { id: number }) => b.id);

  if (branchIds.length === 0) return [];

  const { data, error } = await supabase
    .from("attendance_records")
    .select(
      "*, employees!inner(profile_id, profiles(full_name)), branches!inner(name)"
    )
    .in("branch_id", branchIds)
    .eq("date", date)
    .order("created_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getAttendanceRecords = withServerQuery(_getAttendanceRecords);

// =====================
// Leave Requests
// =====================

async function _getLeaveRequests() {
  const { supabase, tenantId } = await getActionContext();

  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id")
    .eq("tenant_id", tenantId);

  if (empError) throw new ActionError(empError.message, "SERVER_ERROR", 500);

  const empIds = (employees ?? []).map((e) => e.id);
  if (empIds.length === 0) return [];

  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "*, employees!inner(id, profile_id, profiles(full_name)), approver:profiles!fk_leave_approver(full_name)"
    )
    .in("employee_id", empIds)
    .order("created_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getLeaveRequests = withServerQuery(_getLeaveRequests);

async function _createLeaveRequest(data: CreateLeaveRequestInput) {
  const parsed = createLeaveRequestSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase } = await getActionContext();

  const { error } = await supabase.from("leave_requests").insert({
    employee_id: parsed.data.employee_id,
    type: parsed.data.type,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    days: parsed.data.days,
    reason: parsed.data.reason || null,
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/hr");
  return { success: true };
}

export const createLeaveRequest = withServerAction(_createLeaveRequest);

async function _approveLeaveRequest(data: ApproveLeaveRequestInput) {
  const parsed = approveLeaveRequestSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, userId } = await getActionContext();

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: parsed.data.status,
      approved_by: userId,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/hr");
  return { success: true };
}

export const approveLeaveRequest = withServerAction(_approveLeaveRequest);
