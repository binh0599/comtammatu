"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  openSessionSchema,
  closeSessionSchema,
  getActionContext,
  requireBranch,
  requireRole,
  withServerQuery,
  safeDbError,
  safeDbErrorResult,
  CASHIER_ROLES,
} from "@comtammatu/shared";

// ===== Active Session =====

async function _getActiveSession() {
  const ctx = await getActionContext();
  requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thao tác thu ngân");
  const { supabase, userId } = ctx;

  const { data, error } = await supabase
    .from("pos_sessions")
    .select("*, pos_terminals(name, type)")
    .eq("cashier_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (error) throw safeDbError(error, "getActiveSession");
  return data;
}

export const getActiveSession = withServerQuery(_getActiveSession);

// ===== User's Linked Terminal =====

async function _getUserLinkedTerminal() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thao tác thu ngân");
  const { supabase, userId } = ctx;

  // Find terminal linked to user's approved device
  const { data: device } = await supabase
    .from("registered_devices")
    .select("linked_terminal_id")
    .eq("registered_by", userId)
    .eq("status", "approved")
    .not("linked_terminal_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (!device?.linked_terminal_id) return null;

  // Validate terminal belongs to caller's branch, is approved cashier_station, and active
  const { data: terminal } = await supabase
    .from("pos_terminals")
    .select("id, name, type")
    .eq("id", device.linked_terminal_id)
    .eq("branch_id", branchId)
    .eq("type", "cashier_station")
    .eq("is_active", true)
    .not("approved_at", "is", null)
    .maybeSingle();

  return terminal ?? null;
}

export const getUserLinkedTerminal = withServerQuery(_getUserLinkedTerminal);

// ===== Terminals for Session (fallback) =====

async function _getTerminalsForSession() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thao tác thu ngân");
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("pos_terminals")
    .select("id, name, type")
    .eq("branch_id", branchId)
    .eq("type", "cashier_station")
    .eq("is_active", true)
    .not("approved_at", "is", null)
    .order("name");

  if (error) throw safeDbError(error, "getTerminalsForSession");
  return data ?? [];
}

export const getTerminalsForSession = withServerQuery(_getTerminalsForSession);

// ===== Open Session =====

export async function openSession(formData: FormData) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thao tác thu ngân");
  const { supabase, userId } = ctx;

  const parsed = openSessionSchema.safeParse({
    terminal_id: Number(formData.get("terminal_id")),
    opening_amount: Number(formData.get("opening_amount")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // Verify terminal is a cashier_station in the same branch
  const { data: terminal, error: termError } = await supabase
    .from("pos_terminals")
    .select("id, type, branch_id, is_active, approved_at")
    .eq("id", parsed.data.terminal_id)
    .single();

  if (termError || !terminal) {
    return { error: "Thiết bị không tồn tại" };
  }
  if (terminal.type !== "cashier_station") {
    return { error: "Chỉ máy thu ngân mới có thể mở ca" };
  }
  if (!terminal.is_active || !terminal.approved_at) {
    return { error: "Thiết bị chưa được kích hoạt hoặc phê duyệt" };
  }
  if (terminal.branch_id !== branchId) {
    return { error: "Thiết bị không thuộc chi nhánh của bạn" };
  }

  // Check no existing open session for this cashier
  const { data: existing } = await supabase
    .from("pos_sessions")
    .select("id")
    .eq("cashier_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (existing) {
    return { error: "Bạn đã có ca đang mở. Vui lòng đóng ca trước." };
  }

  // Check no existing open session for this terminal
  const { data: terminalSession } = await supabase
    .from("pos_sessions")
    .select("id")
    .eq("terminal_id", parsed.data.terminal_id)
    .eq("status", "open")
    .maybeSingle();

  if (terminalSession) {
    return { error: "Thiết bị này đang có ca mở bởi nhân viên khác" };
  }

  const { error: insertError } = await supabase.from("pos_sessions").insert({
    cashier_id: userId,
    terminal_id: parsed.data.terminal_id,
    branch_id: branchId,
    opening_amount: parsed.data.opening_amount,
    status: "open",
  });

  if (insertError) return safeDbErrorResult(insertError, "openSession");

  revalidatePath("/pos/session");
  revalidatePath("/pos/cashier");
  return { error: null };
}

// ===== Close Session =====

export async function closeSession(formData: FormData) {
  const ctx = await getActionContext();
  requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thao tác thu ngân");
  const { supabase, userId } = ctx;

  const parsed = closeSessionSchema.safeParse({
    session_id: Number(formData.get("session_id")),
    closing_amount: Number(formData.get("closing_amount")),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // Verify session belongs to this cashier and is open
  const { data: session, error: sessionError } = await supabase
    .from("pos_sessions")
    .select("id, opening_amount, cashier_id, status")
    .eq("id", parsed.data.session_id)
    .single();

  if (sessionError || !session) {
    return { error: "Ca làm việc không tồn tại" };
  }
  if (session.cashier_id !== userId) {
    return { error: "Ca này không phải của bạn" };
  }
  if (session.status !== "open") {
    return { error: "Ca đã được đóng" };
  }

  // Calculate expected amount: opening + sum of cash payments during session
  const { data: cashPayments } = await supabase
    .from("payments")
    .select("amount, tip")
    .eq("pos_session_id", session.id)
    .eq("method", "cash")
    .eq("status", "completed");

  type CashPayment = { amount: number; tip: number };
  const cashTotal = ((cashPayments ?? []) as CashPayment[]).reduce(
    (sum, p) => sum + p.amount + p.tip,
    0
  );

  const expectedAmount = session.opening_amount + cashTotal;
  const difference = parsed.data.closing_amount - expectedAmount;

  const { error: updateError } = await supabase
    .from("pos_sessions")
    .update({
      status: "closed",
      closing_amount: parsed.data.closing_amount,
      expected_amount: expectedAmount,
      difference,
      closed_at: new Date().toISOString(),
      notes: parsed.data.notes ?? null,
    })
    .eq("id", session.id);

  if (updateError) return safeDbErrorResult(updateError, "closeSession");

  revalidatePath("/pos/session");
  revalidatePath("/pos/cashier");
  return { error: null };
}

// ===== Session Summary =====

async function _getSessionSummary(sessionId: number) {
  const ctx = await getActionContext();
  requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thao tác thu ngân");
  const { supabase } = ctx;

  // Get payments for this session
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, tip, method, status")
    .eq("pos_session_id", sessionId)
    .eq("status", "completed");

  type SessionPayment = { amount: number; tip: number; method: string; status: string };
  const typedPayments = (payments ?? []) as SessionPayment[];

  const cashTotal = typedPayments
    .filter((p) => p.method === "cash")
    .reduce((sum, p) => sum + p.amount + p.tip, 0);

  const totalPayments = typedPayments.reduce(
    (sum, p) => sum + p.amount + p.tip,
    0
  );

  return {
    totalPayments,
    cashTotal,
    transactionCount: payments?.length ?? 0,
  };
}

export const getSessionSummary = withServerQuery(_getSessionSummary);
