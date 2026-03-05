"use server";

import "@/lib/server-bootstrap";
import {
  ActionError,
  getActionContext,
  getAdminContext,
  ADMIN_ROLES,
  withServerAction,
  withServerQuery,
  createStaffAccountSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  createShiftSchema,
  createShiftAssignmentSchema,
  createLeaveRequestSchema,
  approveLeaveRequestSchema,
  createPayrollPeriodSchema,
  payrollPeriodIdSchema,
  updatePayrollEntrySchema,
  type CreateStaffAccountInput,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
  type CreateShiftAssignmentInput,
  type CreateLeaveRequestInput,
  type ApproveLeaveRequestInput,
  type CreatePayrollPeriodInput,
  type UpdatePayrollEntryInput,
  VALID_PAYROLL_TRANSITIONS,
  type PayrollStatus,
  safeDbError,
  safeDbErrorResult,
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

async function _getEmployees(branchId?: number) {
  const { supabase, tenantId } = await getActionContext();

  let query = supabase
    .from("employees")
    .select("*, profiles!inner(full_name, id, role), branches!inner(name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50); // Pagination / max cap

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;

  if (error) throw safeDbError(error, "db");
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
  return { error: null, success: true };
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
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/hr");
  return { error: null, success: true };
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

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
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

  if (error) throw safeDbError(error, "db");
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

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const createShift = withServerAction(_createShift);

async function _deleteShift(id: number) {
  const { supabase } = await getActionContext();

  const { error } = await supabase.from("shifts").delete().eq("id", id);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
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

  if (error) throw safeDbError(error, "db");
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
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/hr");
  return { error: null, success: true };
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

  if (error) throw safeDbError(error, "db");
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

  if (empError) throw safeDbError(empError, "db");

  const empIds = (employees ?? []).map((e: { id: number }) => e.id);
  if (empIds.length === 0) return [];

  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "*, employees!inner(id, profile_id, profiles(full_name)), approver:profiles!fk_leave_approver(full_name)"
    )
    .in("employee_id", empIds)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
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

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
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

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const approveLeaveRequest = withServerAction(_approveLeaveRequest);

// =====================
// Payroll
// =====================

async function _getPayrollPeriods(branchId?: number) {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  let query = supabase
    .from("payroll_periods")
    .select("*, branches!inner(name), approved_by")
    .eq("tenant_id", tenantId)
    .order("start_date", { ascending: false })
    .limit(50);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getPayrollPeriods = withServerQuery(_getPayrollPeriods);

async function _getPayrollEntries(periodId: number) {
  const validId = payrollPeriodIdSchema.safeParse(periodId);
  if (!validId.success) {
    throw new ActionError("ID kỳ lương không hợp lệ", "VALIDATION_ERROR", 400);
  }
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // Verify the period belongs to the tenant
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("id")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    throw safeDbError(periodError ?? new Error("Kỳ lương không tồn tại"), "db");
  }

  const { data, error } = await supabase
    .from("payroll_entries")
    .select(
      "*, employees!inner(profile_id, branch_id, profiles(full_name))"
    )
    .eq("payroll_period_id", periodId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getPayrollEntries = withServerQuery(_getPayrollEntries);

async function _createPayrollPeriod(data: CreatePayrollPeriodInput) {
  const parsed = createPayrollPeriodSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // Verify branch belongs to tenant
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("id", parsed.data.branch_id)
    .eq("tenant_id", tenantId)
    .single();

  if (branchError || !branch) {
    return { error: "Chi nhánh không hợp lệ" };
  }

  const { error } = await supabase.from("payroll_periods").insert({
    tenant_id: tenantId,
    branch_id: parsed.data.branch_id,
    name: parsed.data.name,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    notes: parsed.data.notes || null,
    status: "draft",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Kỳ lương này đã tồn tại" };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const createPayrollPeriod = withServerAction(_createPayrollPeriod);

async function _calculatePayroll(periodId: number) {
  const validId = payrollPeriodIdSchema.safeParse(periodId);
  if (!validId.success) {
    return { error: "ID kỳ lương không hợp lệ" };
  }
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // Verify period exists, belongs to tenant, and is in draft or calculated status
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("id, branch_id, start_date, end_date, status")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    return { error: "Kỳ lương không tồn tại" };
  }

  if (period.status !== "draft" && period.status !== "calculated") {
    return { error: "Chỉ có thể tính lương cho kỳ ở trạng thái nháp hoặc đã tính" };
  }

  // Fetch all active employees for this branch
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id, hourly_rate, monthly_salary")
    .eq("tenant_id", tenantId)
    .eq("branch_id", period.branch_id)
    .eq("status", "active");

  if (empError) return safeDbErrorResult(empError, "db");

  const empList = employees ?? [];
  const empIds = empList.map((e: { id: number }) => e.id);

  // Batch-fetch all attendance records for all employees in one query
  const hoursMap = new Map<number, number>();
  if (empIds.length > 0) {
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("employee_id, hours_worked")
      .in("employee_id", empIds)
      .gte("date", period.start_date)
      .lte("date", period.end_date);

    if (attendanceError) return safeDbErrorResult(attendanceError, "db");

    for (const r of attendance ?? []) {
      const prev = hoursMap.get(r.employee_id) ?? 0;
      hoursMap.set(r.employee_id, prev + (r.hours_worked ?? 0));
    }
  }

  // For each employee, calculate pay
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: any[] = [];

  for (const emp of empList) {
    const totalHours = hoursMap.get(emp.id) ?? 0;

    // Calculate base_pay
    let basePay = 0;
    if (emp.hourly_rate) {
      basePay = totalHours * Number(emp.hourly_rate);
    } else if (emp.monthly_salary) {
      basePay = Number(emp.monthly_salary);
    }

    entries.push({
      tenant_id: tenantId,
      payroll_period_id: periodId,
      employee_id: emp.id,
      total_hours: totalHours,
      hourly_rate: emp.hourly_rate ?? null,
      monthly_salary: emp.monthly_salary ?? null,
      base_pay: basePay,
      overtime_hours: 0,
      overtime_pay: 0,
      deductions: 0,
      bonuses: 0,
      net_pay: basePay,
    });
  }

  // Upsert payroll entries
  if (entries.length > 0) {
    const { error: upsertError } = await supabase
      .from("payroll_entries")
      .upsert(entries, { onConflict: "payroll_period_id,employee_id" });

    if (upsertError) return safeDbErrorResult(upsertError, "db");
  }

  // Update period status to calculated
  const { error: updateError } = await supabase
    .from("payroll_periods")
    .update({ status: "calculated" })
    .eq("id", periodId)
    .eq("tenant_id", tenantId);

  if (updateError) return safeDbErrorResult(updateError, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const calculatePayroll = withServerAction(_calculatePayroll);

async function _updatePayrollEntry(data: UpdatePayrollEntryInput) {
  const parsed = updatePayrollEntrySchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // Verify the entry belongs to tenant — fetch all fields needed for net_pay recalc
  const { data: entry, error: entryError } = await supabase
    .from("payroll_entries")
    .select("id, payroll_period_id, base_pay, overtime_pay, deductions, bonuses")
    .eq("id", parsed.data.id)
    .eq("tenant_id", tenantId)
    .single();

  if (entryError || !entry) {
    return { error: "Bản ghi lương không tồn tại" };
  }

  // Verify parent period is in 'calculated' status
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("status")
    .eq("id", entry.payroll_period_id)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    return { error: "Kỳ lương không tồn tại" };
  }

  if (period.status !== "calculated") {
    return { error: "Chỉ có thể chỉnh sửa khi kỳ lương ở trạng thái đã tính" };
  }

  // Build update payload — merge with existing values for net_pay recalc
  const basePay = Number(entry.base_pay);
  const overtimePay = parsed.data.overtime_pay ?? Number(entry.overtime_pay);
  const deductions = parsed.data.deductions ?? Number(entry.deductions);
  const bonuses = parsed.data.bonuses ?? Number(entry.bonuses);
  const netPay = basePay + overtimePay + bonuses - deductions;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    net_pay: netPay,
  };
  if (parsed.data.overtime_hours !== undefined) payload.overtime_hours = parsed.data.overtime_hours;
  if (parsed.data.overtime_pay !== undefined) payload.overtime_pay = parsed.data.overtime_pay;
  if (parsed.data.deductions !== undefined) payload.deductions = parsed.data.deductions;
  if (parsed.data.bonuses !== undefined) payload.bonuses = parsed.data.bonuses;
  if (parsed.data.notes !== undefined) payload.notes = parsed.data.notes || null;

  const { error } = await supabase
    .from("payroll_entries")
    .update(payload)
    .eq("id", parsed.data.id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const updatePayrollEntry = withServerAction(_updatePayrollEntry);

async function _approvePayroll(periodId: number) {
  const validId = payrollPeriodIdSchema.safeParse(periodId);
  if (!validId.success) {
    return { error: "ID kỳ lương không hợp lệ" };
  }
  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  // Verify period belongs to tenant
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("id, status")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    return { error: "Kỳ lương không tồn tại" };
  }

  const validNext = VALID_PAYROLL_TRANSITIONS[period.status as PayrollStatus];
  if (!validNext?.includes("approved")) {
    return { error: "Không thể duyệt kỳ lương ở trạng thái này" };
  }

  const { error } = await supabase
    .from("payroll_periods")
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", periodId)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const approvePayroll = withServerAction(_approvePayroll);

async function _markPayrollPaid(periodId: number) {
  const validId = payrollPeriodIdSchema.safeParse(periodId);
  if (!validId.success) {
    return { error: "ID kỳ lương không hợp lệ" };
  }
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // Verify period belongs to tenant
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("id, status")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    return { error: "Kỳ lương không tồn tại" };
  }

  const validNext = VALID_PAYROLL_TRANSITIONS[period.status as PayrollStatus];
  if (!validNext?.includes("paid")) {
    return { error: "Không thể đánh dấu đã trả lương ở trạng thái này" };
  }

  const { error } = await supabase
    .from("payroll_periods")
    .update({ status: "paid" })
    .eq("id", periodId)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const markPayrollPaid = withServerAction(_markPayrollPaid);

async function _deletePayrollPeriod(periodId: number) {
  const validId = payrollPeriodIdSchema.safeParse(periodId);
  if (!validId.success) {
    return { error: "ID kỳ lương không hợp lệ" };
  }
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // Verify period belongs to tenant and is in draft status
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("id, status")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .single();

  if (periodError || !period) {
    return { error: "Kỳ lương không tồn tại" };
  }

  if (period.status !== "draft") {
    return { error: "Chỉ có thể xóa kỳ lương ở trạng thái nháp" };
  }

  const { error } = await supabase
    .from("payroll_periods")
    .delete()
    .eq("id", periodId)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/hr");
  return { error: null, success: true };
}

export const deletePayrollPeriod = withServerAction(_deletePayrollPeriod);
