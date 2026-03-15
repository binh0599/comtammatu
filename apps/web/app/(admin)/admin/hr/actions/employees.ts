"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createStaffAccountSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  type CreateStaffAccountInput,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic table helper requires untyped client for dynamic .from() calls
export async function getBranchesInternal(supabase: any, tenantId: number) {
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

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic update payload shape depends on which fields changed
  const payload: Record<string, any> = {};
  if (parsed.data.position !== undefined) payload.position = parsed.data.position;
  if (parsed.data.department !== undefined) payload.department = parsed.data.department || null;
  if (parsed.data.branch_id !== undefined) payload.branch_id = parsed.data.branch_id;
  if (parsed.data.employment_type !== undefined)
    payload.employment_type = parsed.data.employment_type;
  if (parsed.data.hourly_rate !== undefined) payload.hourly_rate = parsed.data.hourly_rate ?? null;
  if (parsed.data.monthly_salary !== undefined)
    payload.monthly_salary = parsed.data.monthly_salary ?? null;
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;
  if (parsed.data.emergency_contact !== undefined)
    payload.emergency_contact = parsed.data.emergency_contact ?? null;

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
