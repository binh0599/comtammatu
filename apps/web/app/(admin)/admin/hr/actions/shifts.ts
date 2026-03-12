"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createShiftSchema,
  createShiftAssignmentSchema,
  type CreateShiftAssignmentInput,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

import { getBranchesInternal } from "./employees";

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
