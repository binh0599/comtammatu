"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  createShiftSchema,
  createShiftAssignmentSchema,
  createLeaveRequestSchema,
  approveLeaveRequestSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
  type CreateShiftAssignmentInput,
  type CreateLeaveRequestInput,
  type ApproveLeaveRequestInput,
} from "@comtammatu/shared";

// --- Helper: Get tenant_id + userId from authenticated user ---

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.tenant_id;
  if (!tenantId) throw new Error("No tenant assigned");

  return { supabase, tenantId, userId: user.id };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBranches(supabase: any, tenantId: number) {
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

export async function getBranchesForHr() {
  const { supabase, tenantId } = await getTenantId();
  return getBranches(supabase, tenantId);
}

// =====================
// Employees
// =====================

export async function getEmployees() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("employees")
    .select("*, profiles!inner(full_name, id, role), branches!inner(name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAvailableProfiles() {
  const { supabase, tenantId } = await getTenantId();

  // Get all profiles for the tenant
  const { data: allProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("full_name");

  if (profilesError) throw new Error(profilesError.message);

  // Get all employees for the tenant
  const { data: existingEmployees, error: employeesError } = await supabase
    .from("employees")
    .select("profile_id")
    .eq("tenant_id", tenantId);

  if (employeesError) throw new Error(employeesError.message);

  const usedProfileIds = new Set(
    existingEmployees?.map((e) => e.profile_id) ?? []
  );

  return (allProfiles ?? []).filter(
    (profile) => !usedProfileIds.has(profile.id)
  );
}

export async function createEmployee(data: CreateEmployeeInput) {
  const parsed = createEmployeeSchema.safeParse(data);

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le",
    };
  }

  const { supabase, tenantId } = await getTenantId();

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
      return { error: "Nhan vien nay da ton tai trong he thong" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/hr");
  return { success: true };
}

export async function updateEmployee(id: number, data: UpdateEmployeeInput) {
  const parsed = updateEmployeeSchema.safeParse(data);

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le",
    };
  }

  const { supabase } = await getTenantId();

  // Build update payload, only include defined fields
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
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/hr");
  return { success: true };
}

// =====================
// Shifts
// =====================

export async function getShifts() {
  const { supabase, tenantId } = await getTenantId();

  const branchList = await getBranches(supabase, tenantId);
  const branchIds = branchList.map((b: { id: number }) => b.id);

  if (branchIds.length === 0) return [];

  const { data, error } = await supabase
    .from("shifts")
    .select("*, branches!inner(name)")
    .in("branch_id", branchIds)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createShift(formData: FormData) {
  const parsed = createShiftSchema.safeParse({
    branch_id: formData.get("branch_id"),
    name: formData.get("name"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    break_min: formData.get("break_min") || undefined,
    max_employees: formData.get("max_employees") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le",
    };
  }

  const { supabase } = await getTenantId();

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

export async function deleteShift(id: number) {
  const { supabase } = await getTenantId();

  const { error } = await supabase.from("shifts").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/hr");
  return { success: true };
}

// =====================
// Shift Assignments (Schedule)
// =====================

export async function getShiftAssignments(startDate: string, endDate: string) {
  const { supabase, tenantId } = await getTenantId();

  const branchList = await getBranches(supabase, tenantId);
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

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createShiftAssignment(data: CreateShiftAssignmentInput) {
  const parsed = createShiftAssignmentSchema.safeParse(data);

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le",
    };
  }

  const { supabase } = await getTenantId();

  const { error } = await supabase.from("shift_assignments").insert({
    shift_id: parsed.data.shift_id,
    employee_id: parsed.data.employee_id,
    date: parsed.data.date,
    notes: parsed.data.notes || null,
    status: "scheduled",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Nhan vien nay da duoc phan ca nay trong ngay" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/hr");
  return { success: true };
}

// =====================
// Attendance
// =====================

export async function getAttendanceRecords(date: string) {
  const { supabase, tenantId } = await getTenantId();

  const branchList = await getBranches(supabase, tenantId);
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

  if (error) throw new Error(error.message);
  return data ?? [];
}

// =====================
// Leave Requests
// =====================

export async function getLeaveRequests() {
  const { supabase, tenantId } = await getTenantId();

  // Get employees for this tenant to filter leave requests
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id")
    .eq("tenant_id", tenantId);

  if (empError) throw new Error(empError.message);

  const empIds = (employees ?? []).map((e) => e.id);

  if (empIds.length === 0) return [];

  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "*, employees!inner(id, profile_id, profiles(full_name)), approver:profiles!fk_leave_approver(full_name)"
    )
    .in("employee_id", empIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createLeaveRequest(data: CreateLeaveRequestInput) {
  const parsed = createLeaveRequestSchema.safeParse(data);

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le",
    };
  }

  const { supabase } = await getTenantId();

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

export async function approveLeaveRequest(data: ApproveLeaveRequestInput) {
  const parsed = approveLeaveRequestSchema.safeParse(data);

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le",
    };
  }

  const { supabase, userId } = await getTenantId();

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
