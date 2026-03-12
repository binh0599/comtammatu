"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createLeaveRequestSchema,
  approveLeaveRequestSchema,
  type CreateLeaveRequestInput,
  type ApproveLeaveRequestInput,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

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
