"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import { openSessionSchema, closeSessionSchema } from "@comtammatu/shared";

async function getCashierProfile() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, branch_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  if (!profile.branch_id) throw new Error("No branch assigned");

  const role = profile.role;
  if (!["cashier", "manager", "owner"].includes(role)) {
    throw new Error("Not authorized for cashier operations");
  }

  return { supabase, userId: user.id, profile };
}

export async function getActiveSession() {
  const { supabase, userId } = await getCashierProfile();

  const { data, error } = await supabase
    .from("pos_sessions")
    .select("*, pos_terminals(name, type)")
    .eq("cashier_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getTerminalsForSession() {
  const { supabase, profile } = await getCashierProfile();

  const { data, error } = await supabase
    .from("pos_terminals")
    .select("id, name, type")
    .eq("branch_id", profile.branch_id!)
    .eq("type", "cashier_station")
    .eq("is_active", true)
    .not("approved_at", "is", null)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function openSession(formData: FormData) {
  const { supabase, userId, profile } = await getCashierProfile();

  const parsed = openSessionSchema.safeParse({
    terminal_id: Number(formData.get("terminal_id")),
    opening_amount: Number(formData.get("opening_amount")),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" };
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
  if (terminal.branch_id !== profile.branch_id) {
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
    branch_id: profile.branch_id!,
    opening_amount: parsed.data.opening_amount,
    status: "open",
  });

  if (insertError) return { error: insertError.message };

  revalidatePath("/pos/session");
  revalidatePath("/pos/cashier");
  return { error: null };
}

export async function closeSession(formData: FormData) {
  const { supabase, userId } = await getCashierProfile();

  const parsed = closeSessionSchema.safeParse({
    session_id: Number(formData.get("session_id")),
    closing_amount: Number(formData.get("closing_amount")),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" };
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

  const cashTotal = (cashPayments ?? []).reduce(
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

  if (updateError) return { error: updateError.message };

  revalidatePath("/pos/session");
  revalidatePath("/pos/cashier");
  return { error: null };
}

export async function getSessionSummary(sessionId: number) {
  const { supabase } = await getCashierProfile();

  // Get payments for this session
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, tip, method, status")
    .eq("pos_session_id", sessionId)
    .eq("status", "completed");

  const cashTotal = (payments ?? [])
    .filter((p) => p.method === "cash")
    .reduce((sum, p) => sum + p.amount + p.tip, 0);

  const totalPayments = (payments ?? []).reduce(
    (sum, p) => sum + p.amount + p.tip,
    0
  );

  return {
    totalPayments,
    cashTotal,
    transactionCount: payments?.length ?? 0,
  };
}
