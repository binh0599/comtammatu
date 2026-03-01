"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import { processPaymentSchema } from "@comtammatu/shared";

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

export async function processPayment(data: {
  order_id: number;
  method: "cash";
  amount_tendered: number;
  tip?: number;
}) {
  const { supabase, userId, profile } = await getCashierProfile();

  const parsed = processPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  // Get active session
  const { data: session, error: sessionError } = await supabase
    .from("pos_sessions")
    .select("id, terminal_id")
    .eq("cashier_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (sessionError) return { error: sessionError.message };
  if (!session) {
    return { error: "Chưa mở ca. Vui lòng mở ca trước khi thanh toán." };
  }

  // Verify terminal is cashier_station
  const { data: terminal } = await supabase
    .from("pos_terminals")
    .select("type")
    .eq("id", session.terminal_id)
    .single();

  if (terminal?.type !== "cashier_station") {
    return { error: "Chỉ máy thu ngân mới có thể xử lý thanh toán" };
  }

  // Get order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total, status, table_id, type")
    .eq("id", parsed.data.order_id)
    .single();

  if (orderError || !order) return { error: "Đơn hàng không tồn tại" };

  if (order.status === "completed") {
    return { error: "Đơn hàng đã thanh toán" };
  }
  if (order.status === "cancelled") {
    return { error: "Đơn hàng đã bị hủy" };
  }

  const tip = parsed.data.tip ?? 0;
  const totalDue = order.total + tip;

  if (parsed.data.amount_tendered < totalDue) {
    return {
      error: `Số tiền khách đưa (${parsed.data.amount_tendered}) không đủ. Cần thanh toán: ${totalDue}`,
    };
  }

  const change = parsed.data.amount_tendered - totalDue;
  const idempotencyKey = crypto.randomUUID();

  // Insert payment
  const { error: paymentError } = await supabase.from("payments").insert({
    order_id: order.id,
    pos_session_id: session.id,
    terminal_id: session.terminal_id,
    method: "cash",
    amount: order.total,
    tip,
    status: "completed",
    paid_at: new Date().toISOString(),
    idempotency_key: idempotencyKey,
  });

  if (paymentError) {
    if (paymentError.code === "23505") {
      return { error: "Giao dịch đã được xử lý" };
    }
    return { error: paymentError.message };
  }

  // Update order: link to session and mark completed
  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({
      pos_session_id: session.id,
      status: "completed",
    })
    .eq("id", order.id);

  if (orderUpdateError) return { error: orderUpdateError.message };

  // Free up table
  if (order.table_id && order.type === "dine_in") {
    await supabase
      .from("tables")
      .update({ status: "available" })
      .eq("id", order.table_id);
  }

  revalidatePath("/pos/cashier");
  revalidatePath("/pos/orders");

  return {
    error: null,
    change,
    paymentAmount: order.total,
    tip,
  };
}

export async function getCashierOrders() {
  const { supabase, profile } = await getCashierProfile();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, type, total, created_at, table_id, tables(number), order_items(id, quantity, menu_items(name))"
    )
    .eq("branch_id", profile.branch_id!)
    .in("status", ["confirmed", "preparing", "ready", "served"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
