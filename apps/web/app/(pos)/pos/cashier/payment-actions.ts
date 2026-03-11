"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  processPaymentSchema,
  getActionContext,
  requireBranch,
  requireRole,
  withServerAction,
  auditLog,
  safeDbErrorResult,
  CASHIER_ROLES,
} from "@comtammatu/shared";
import { maybeReleaseTable } from "../orders/helpers";

async function _processPayment(data: {
  order_id: number;
  method: "cash" | "qr" | "transfer";
  amount_tendered?: number;
  tip?: number;
}) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thực hiện thao tác thu ngân");
  const { supabase, userId, tenantId } = ctx;

  const parsed = processPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  // Get active session
  const { data: session, error: sessionError } = await supabase
    .from("pos_sessions")
    .select("id, terminal_id")
    .eq("cashier_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (sessionError) return safeDbErrorResult(sessionError, "db");
  if (!session) {
    return { error: "Chưa mở ca. Vui lòng mở ca trước khi thanh toán." };
  }

  // Verify terminal is cashier_station
  if (session.terminal_id != null) {
    const { data: terminal } = await supabase
      .from("pos_terminals")
      .select("type")
      .eq("id", session.terminal_id)
      .single();

    if (terminal?.type !== "cashier_station") {
      return { error: "Chỉ máy thu ngân mới có thể xử lý thanh toán" };
    }
  } else {
    // New device flow: verify user has an approved cashier_station device
    const { data: device } = await supabase
      .from("registered_devices")
      .select("terminal_type")
      .eq("registered_by", userId)
      .eq("status", "approved")
      .eq("terminal_type", "cashier_station")
      .limit(1)
      .maybeSingle();

    if (!device) {
      return { error: "Chỉ máy thu ngân mới có thể xử lý thanh toán" };
    }
  }

  // Get order — validate branch ownership
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total, status, table_id, type")
    .eq("id", parsed.data.order_id)
    .eq("branch_id", branchId)
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

  // Cash-specific validation
  if (parsed.data.method === "cash") {
    const amountTendered = parsed.data.amount_tendered ?? 0;
    if (amountTendered < totalDue) {
      return {
        error: `Số tiền khách đưa (${amountTendered}) không đủ. Cần thanh toán: ${totalDue}`,
      };
    }
  }

  const change =
    parsed.data.method === "cash"
      ? (parsed.data.amount_tendered ?? 0) - totalDue
      : 0;

  const idempotencyKey = crypto.randomUUID();

  // Insert payment
  const { error: paymentError } = await supabase.from("payments").insert({
    order_id: order.id,
    pos_session_id: session.id,
    terminal_id: session.terminal_id,
    method: parsed.data.method,
    provider: parsed.data.method === "qr" ? "momo" : parsed.data.method === "transfer" ? "vietqr" : null,
    amount: order.total,
    tip,
    status: parsed.data.method === "cash" ? "completed" : "pending",  // qr + transfer start as pending
    paid_at: parsed.data.method === "cash" ? new Date().toISOString() : null,
    idempotency_key: idempotencyKey,
  });

  if (paymentError) {
    if (paymentError.code === "23505") {
      return { error: "Giao dịch đã được xử lý" };
    }
    return safeDbErrorResult(paymentError, "db");
  }

  // For cash: complete order immediately
  if (parsed.data.method === "cash") {
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        pos_session_id: session.id,
        status: "completed",
      })
      .eq("id", order.id);

    if (orderUpdateError) return safeDbErrorResult(orderUpdateError, "db");

    // Free up table — only if no other active orders remain on this table
    if (order.table_id && order.type === "dine_in") {
      await maybeReleaseTable(supabase, order.table_id, branchId, order.id);
    }

    // Increment voucher usage if discount was applied
    const { data: voucherDiscount } = await supabase
      .from("order_discounts")
      .select("voucher_id")
      .eq("order_id", order.id)
      .eq("type", "voucher")
      .maybeSingle();

    if (voucherDiscount?.voucher_id) {
      await supabase.rpc("increment_voucher_usage", {
        p_voucher_id: voucherDiscount.voucher_id,
      });
    }
  }

  // Audit log: payment processed
  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "payment_processed",
    resource_type: "payment",
    resource_id: order.id,
    changes: {
      order_id: order.id,
      method: parsed.data.method,
      amount: order.total,
      tip,
      change,
      idempotency_key: idempotencyKey,
    },
  });

  revalidatePath("/pos/cashier");
  revalidatePath("/pos/orders");

  return {
    error: null,
    change,
    paymentAmount: order.total,
    tip,
    idempotencyKey,
    method: parsed.data.method,
  };
}

export const processPayment = withServerAction(_processPayment);
