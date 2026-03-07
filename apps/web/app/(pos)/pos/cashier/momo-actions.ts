"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  requireBranch,
  requireRole,
  withServerAction,
  safeDbErrorResult,
  CASHIER_ROLES,
} from "@comtammatu/shared";

// ---------------------------------------------------------------------------
// createMomoPayment
// ---------------------------------------------------------------------------

async function _createMomoPayment(orderId: number) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thực hiện thao tác thu ngân");
  const { supabase, userId } = ctx;

  // Get active session
  const { data: session } = await supabase
    .from("pos_sessions")
    .select("id, terminal_id")
    .eq("cashier_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (!session) return { error: "Chưa mở ca." };

  // Verify terminal is cashier_station
  const { data: terminal } = await supabase
    .from("pos_terminals")
    .select("type")
    .eq("id", session.terminal_id)
    .single();

  if (terminal?.type !== "cashier_station") {
    return { error: "Chỉ máy thu ngân mới có thể xử lý thanh toán" };
  }

  // Get order — validate branch ownership
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, total, status")
    .eq("id", orderId)
    .eq("branch_id", branchId)
    .single();

  if (!order) return { error: "Đơn hàng không tồn tại" };
  if (order.status === "completed") return { error: "Đơn đã thanh toán" };
  if (order.status === "cancelled") return { error: "Đơn đã hủy" };

  const idempotencyKey = crypto.randomUUID();

  // Insert pending payment
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      pos_session_id: session.id,
      terminal_id: session.terminal_id,
      method: "qr",
      provider: "momo",
      amount: order.total,
      tip: 0,
      status: "pending",
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (payErr) {
    if (payErr.code === "23505") return { error: "Đang chờ thanh toán" };
    return safeDbErrorResult(payErr, "db");
  }

  // Call Momo API
  try {
    const { createMomoPaymentRequest } = await import("@/lib/momo");
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://comtammatu.vercel.app";
    const result = await createMomoPaymentRequest({
      orderId: `ORDER-${order.id}-${idempotencyKey.slice(0, 8)}`,
      orderInfo: `Thanh toán đơn ${order.order_number}`,
      amount: Math.round(order.total),
      requestId: idempotencyKey,
      ipnUrl: `${appUrl}/api/webhooks/momo`,
      redirectUrl: `${appUrl}/pos/cashier`,
    });

    return {
      error: null,
      qrCodeUrl: result.qrCodeUrl,
      payUrl: result.payUrl,
      paymentId: payment.id,
      idempotencyKey,
    };
  } catch (err) {
    // Cleanup: mark payment as failed
    await supabase
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    return { error: err instanceof Error ? err.message : "Lỗi kết nối Momo" };
  }
}

export const createMomoPayment = withServerAction(_createMomoPayment);

// ---------------------------------------------------------------------------
// checkPaymentStatus
// ---------------------------------------------------------------------------

async function _checkPaymentStatus(paymentId: number) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thực hiện thao tác thu ngân");
  const { supabase } = ctx;

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, reference_no, paid_at, order_id")
    .eq("id", paymentId)
    .single();

  if (!payment) return { error: "Không tìm thấy giao dịch" };

  // Validate payment belongs to user's branch via order
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("id", payment.order_id)
    .eq("branch_id", branchId)
    .single();

  if (!order) return { error: "Không tìm thấy giao dịch" };

  return {
    error: null,
    status: payment.status,
    reference_no: payment.reference_no,
    paid_at: payment.paid_at,
  };
}

export const checkPaymentStatus = withServerAction(_checkPaymentStatus);
