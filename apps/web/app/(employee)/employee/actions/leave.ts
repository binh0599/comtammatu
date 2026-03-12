"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createMyLeaveRequestSchema,
  type CreateMyLeaveRequestInput,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";
import { findMyEmployee } from "./_helpers";

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
