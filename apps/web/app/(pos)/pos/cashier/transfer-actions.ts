"use server";

import "@/lib/server-bootstrap";
import { z } from "zod";
import {
  getActionContext,
  requireBranch,
  requireRole,
  withServerAction,
  safeDbErrorResult,
  CASHIER_ROLES,
  entityIdSchema,
  paymentMethodsConfigSchema,
} from "@comtammatu/shared";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const confirmTransferPaymentSchema = z.object({
  paymentId: entityIdSchema,
  referenceNo: z.string().max(100).optional(),
});

// ---------------------------------------------------------------------------
// createTransferPayment — generates VietQR code for bank transfer
// ---------------------------------------------------------------------------

async function _createTransferPayment(orderId: number) {
  const parsedOrderId = entityIdSchema.parse(orderId);

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

  if (!session || !session.terminal_id) return { error: "Chưa mở ca." };

  // Verify terminal is cashier_station (PAYMENT_TERMINAL rule)
  const { data: terminal, error: terminalError } = await supabase
    .from("pos_terminals")
    .select("type")
    .eq("id", session.terminal_id)
    .maybeSingle();

  if (terminalError) {
    return safeDbErrorResult(terminalError, "terminal");
  }
  if (!terminal) {
    return { error: "Không tìm thấy thiết bị POS. Thiết bị có thể đã bị xóa." };
  }
  if (terminal.type !== "cashier_station") {
    return { error: "Chỉ máy thu ngân mới có thể xử lý thanh toán" };
  }

  // Get order — validate branch ownership
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, total, status")
    .eq("id", parsedOrderId)
    .eq("branch_id", branchId)
    .single();

  if (!order) return { error: "Đơn hàng không tồn tại" };
  if (order.status === "completed") return { error: "Đơn đã thanh toán" };
  if (order.status === "cancelled") return { error: "Đơn đã hủy" };

  // Get tenant's bank transfer config from system_settings
  const { data: branch } = await supabase
    .from("branches")
    .select("tenant_id")
    .eq("id", branchId)
    .single();

  if (!branch) return { error: "Chi nhánh không tồn tại" };

  const { data: settingRow } = await supabase
    .from("system_settings")
    .select("value")
    .eq("tenant_id", branch.tenant_id)
    .eq("key", "payment_methods_config")
    .single();

  if (!settingRow?.value) {
    return { error: "Chưa cấu hình phương thức thanh toán. Vui lòng thiết lập trong Admin > Cài đặt." };
  }

  const parsed = paymentMethodsConfigSchema.safeParse(settingRow.value);
  if (!parsed.success || !parsed.data.bank_transfer) {
    return { error: "Chưa cấu hình tài khoản ngân hàng. Vui lòng thiết lập trong Admin > Cài đặt." };
  }

  if (!parsed.data.enabled_methods.includes("transfer")) {
    return { error: "Phương thức chuyển khoản chưa được bật." };
  }

  const bankConfig = parsed.data.bank_transfer;
  const amount = Math.round(order.total);
  const addInfo = `DH${order.order_number}`;

  // Build VietQR Quick Link URL
  const qrUrl = `https://img.vietqr.io/image/${bankConfig.bank_id}-${bankConfig.account_no}-${bankConfig.template}.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(bankConfig.account_name)}`;

  // Insert pending payment record
  const idempotencyKey = crypto.randomUUID();

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      pos_session_id: session.id,
      terminal_id: session.terminal_id,
      method: "transfer",
      provider: "vietqr",
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

  return {
    error: null,
    qrUrl,
    paymentId: payment.id,
    idempotencyKey,
    bankName: bankConfig.bank_id,
    accountNo: bankConfig.account_no,
    accountName: bankConfig.account_name,
    amount,
    addInfo,
  };
}

export const createTransferPayment = withServerAction(_createTransferPayment);

// ---------------------------------------------------------------------------
// confirmTransferPayment — cashier manually confirms bank transfer received
// ---------------------------------------------------------------------------

async function _confirmTransferPayment(
  input: z.infer<typeof confirmTransferPaymentSchema>,
) {
  const data = confirmTransferPaymentSchema.parse(input);

  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thực hiện thao tác thu ngân");
  const { supabase } = ctx;

  // Get payment and verify it's a pending transfer
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, method, order_id")
    .eq("id", data.paymentId)
    .single();

  if (!payment) return { error: "Không tìm thấy giao dịch" };
  if (payment.method !== "transfer") return { error: "Giao dịch không phải chuyển khoản" };
  if (payment.status === "completed") return { error: "Giao dịch đã hoàn tất" };
  if (payment.status === "failed") return { error: "Giao dịch đã thất bại" };

  // Verify payment belongs to user's branch via order
  const { data: order } = await supabase
    .from("orders")
    .select("id, table_id, type")
    .eq("id", payment.order_id)
    .eq("branch_id", branchId)
    .single();

  if (!order) return { error: "Không tìm thấy đơn hàng" };

  // Update payment to completed
  const { error: updateErr } = await supabase
    .from("payments")
    .update({
      status: "completed",
      paid_at: new Date().toISOString(),
      reference_no: data.referenceNo || null,
    })
    .eq("id", payment.id);

  if (updateErr) return safeDbErrorResult(updateErr, "db");

  // Complete the order
  const { error: orderErr } = await supabase
    .from("orders")
    .update({ status: "completed" })
    .eq("id", order.id);

  if (orderErr) return safeDbErrorResult(orderErr, "db");

  // Release table if dine_in
  if (order.table_id && order.type === "dine_in") {
    const { maybeReleaseTable } = await import("../orders/helpers");
    await maybeReleaseTable(supabase, order.table_id, branchId, order.id);
  }

  return { error: null };
}

export const confirmTransferPayment = withServerAction(_confirmTransferPayment);
