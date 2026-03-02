"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import {
  processPaymentSchema,
  validateVoucherSchema,
  applyVoucherSchema,
  ActionError,
  handleServerActionError,
  auditLog,
} from "@comtammatu/shared";

async function getCashierProfile() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    throw new ActionError("Bạn phải đăng nhập", "UNAUTHORIZED", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, branch_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile)
    throw new ActionError("Hồ sơ không tìm thấy", "NOT_FOUND", 404);
  if (!profile.branch_id)
    throw new ActionError("Chưa được gán chi nhánh", "VALIDATION_ERROR", 400);

  const role = profile.role;
  if (!["cashier", "manager", "owner"].includes(role)) {
    throw new ActionError(
      "Bạn không có quyền thực hiện thao tác thu ngân",
      "UNAUTHORIZED",
      403,
    );
  }

  return { supabase, userId: user.id, profile };
}

// ===== Payment Processing =====

async function _processPayment(data: {
  order_id: number;
  method: "cash" | "qr";
  amount_tendered?: number;
  tip?: number;
}) {
  const { supabase, userId, profile } = await getCashierProfile();

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

  // Get order — validate branch ownership
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total, status, table_id, type")
    .eq("id", parsed.data.order_id)
    .eq("branch_id", profile.branch_id!)
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
    method: parsed.data.method === "cash" ? "cash" : "qr",
    provider: parsed.data.method === "qr" ? "momo" : null,
    amount: order.total,
    tip,
    status: parsed.data.method === "cash" ? "completed" : "pending",
    paid_at: parsed.data.method === "cash" ? new Date().toISOString() : null,
    idempotency_key: idempotencyKey,
  });

  if (paymentError) {
    if (paymentError.code === "23505") {
      return { error: "Giao dịch đã được xử lý" };
    }
    return { error: paymentError.message };
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

    if (orderUpdateError) return { error: orderUpdateError.message };

    // Free up table
    if (order.table_id && order.type === "dine_in") {
      await supabase
        .from("tables")
        .update({ status: "available" })
        .eq("id", order.table_id);
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
    tenant_id: profile.tenant_id,
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

export async function processPayment(data: {
  order_id: number;
  method: "cash" | "qr";
  amount_tendered?: number;
  tip?: number;
}) {
  try {
    return await _processPayment(data);
  } catch (error) {
    if (error instanceof Error && "digest" in error) {
      throw error;
    }
    return handleServerActionError(error);
  }
}

// ===== Voucher Validation & Application =====

async function _validateVoucher(data: {
  code: string;
  branch_id: number;
  subtotal: number;
}) {
  const { supabase, profile } = await getCashierProfile();

  const parsed = validateVoucherSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  // Find voucher by code + tenant
  const { data: voucher, error: voucherError } = await supabase
    .from("vouchers")
    .select(
      "id, code, type, value, min_order, max_discount, valid_from, valid_to, max_uses, used_count, is_active",
    )
    .eq("tenant_id", profile.tenant_id)
    .ilike("code", parsed.data.code)
    .maybeSingle();

  if (voucherError) return { error: voucherError.message };
  if (!voucher) return { error: "Mã voucher không tồn tại" };

  if (!voucher.is_active) return { error: "Voucher đã bị vô hiệu hóa" };

  const now = new Date();
  if (new Date(voucher.valid_from) > now)
    return { error: "Voucher chưa đến thời gian sử dụng" };
  if (new Date(voucher.valid_to) < now)
    return { error: "Voucher đã hết hạn" };

  if (
    voucher.max_uses !== null &&
    voucher.used_count >= voucher.max_uses
  ) {
    return { error: "Voucher đã hết lượt sử dụng" };
  }

  // Check branch scope
  const { data: voucherBranches } = await supabase
    .from("voucher_branches")
    .select("branch_id")
    .eq("voucher_id", voucher.id);

  if (voucherBranches && voucherBranches.length > 0) {
    const branchIds = voucherBranches.map((vb) => vb.branch_id);
    if (!branchIds.includes(parsed.data.branch_id)) {
      return { error: "Voucher không áp dụng cho chi nhánh này" };
    }
  }

  // Check minimum order
  if (
    voucher.min_order !== null &&
    parsed.data.subtotal < voucher.min_order
  ) {
    return {
      error: `Đơn hàng tối thiểu ${new Intl.NumberFormat("vi-VN").format(voucher.min_order)}₫ để sử dụng voucher`,
    };
  }

  // Calculate discount
  let discountAmount = 0;
  if (voucher.type === "percent") {
    discountAmount = Math.round(
      (parsed.data.subtotal * voucher.value) / 100,
    );
    if (voucher.max_discount !== null) {
      discountAmount = Math.min(discountAmount, voucher.max_discount);
    }
  } else if (voucher.type === "fixed") {
    discountAmount = Math.min(voucher.value, parsed.data.subtotal);
  }

  return {
    error: null,
    voucher_id: voucher.id,
    code: voucher.code,
    type: voucher.type,
    value: voucher.value,
    discount_amount: discountAmount,
  };
}

export async function validateVoucher(data: {
  code: string;
  branch_id: number;
  subtotal: number;
}) {
  try {
    return await _validateVoucher(data);
  } catch (error) {
    if (error instanceof Error && "digest" in error) {
      throw error;
    }
    return handleServerActionError(error);
  }
}

async function _applyVoucherToOrder(data: {
  order_id: number;
  voucher_code: string;
}) {
  const { supabase, userId, profile } = await getCashierProfile();

  const parsed = applyVoucherSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  // Get order — validate branch ownership
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, subtotal, tax, service_charge, discount_total, total, status, branch_id",
    )
    .eq("id", parsed.data.order_id)
    .eq("branch_id", profile.branch_id!)
    .single();

  if (orderError || !order) return { error: "Đơn hàng không tồn tại" };
  if (order.status === "completed" || order.status === "cancelled") {
    return { error: "Không thể áp dụng voucher cho đơn đã hoàn tất/hủy" };
  }

  // Check if voucher already applied
  const { data: existingDiscount } = await supabase
    .from("order_discounts")
    .select("id")
    .eq("order_id", order.id)
    .eq("type", "voucher")
    .maybeSingle();

  if (existingDiscount) {
    return {
      error: "Đơn hàng đã có voucher. Vui lòng xóa voucher cũ trước.",
    };
  }

  // Validate voucher (call internal fn to preserve type narrowing)
  const validation = await _validateVoucher({
    code: parsed.data.voucher_code,
    branch_id: order.branch_id,
    subtotal: order.subtotal,
  });

  if (validation.error) return { error: validation.error };

  const discountAmount = validation.discount_amount!;

  // Insert order_discount
  const { error: discountError } = await supabase
    .from("order_discounts")
    .insert({
      order_id: order.id,
      type: "voucher",
      value: discountAmount,
      reason: validation.code,
      applied_by: userId,
      voucher_id: validation.voucher_id,
    });

  if (discountError) return { error: discountError.message };

  // Recalculate order totals (tax/service on discounted subtotal)
  const { data: settings } = await supabase
    .from("system_settings")
    .select("key, value")
    .eq("tenant_id", profile.tenant_id)
    .in("key", ["tax_rate", "service_charge"]);

  const taxRate =
    Number(
      settings?.find((s) => s.key === "tax_rate")?.value ?? 10,
    ) / 100;
  const serviceChargeRate =
    Number(
      settings?.find((s) => s.key === "service_charge")?.value ?? 5,
    ) / 100;

  const discountedSubtotal = order.subtotal - discountAmount;
  const newTax = Math.round(discountedSubtotal * taxRate);
  const newServiceCharge = Math.round(discountedSubtotal * serviceChargeRate);
  const newTotal = discountedSubtotal + newTax + newServiceCharge;

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      discount_total: discountAmount,
      tax: newTax,
      service_charge: newServiceCharge,
      total: newTotal,
    })
    .eq("id", order.id);

  if (updateError) return { error: updateError.message };

  // Audit log: voucher applied
  await auditLog(supabase, {
    tenant_id: profile.tenant_id,
    user_id: userId,
    action: "voucher_applied",
    resource_type: "order_discount",
    resource_id: order.id,
    changes: {
      order_id: order.id,
      voucher_code: validation.code,
      voucher_id: validation.voucher_id,
      discount_amount: discountAmount,
      new_total: newTotal,
    },
  });

  revalidatePath("/pos/cashier");

  return {
    error: null,
    discount_amount: discountAmount,
    new_total: newTotal,
    voucher_code: validation.code,
  };
}

export async function applyVoucherToOrder(data: {
  order_id: number;
  voucher_code: string;
}) {
  try {
    return await _applyVoucherToOrder(data);
  } catch (error) {
    if (error instanceof Error && "digest" in error) {
      throw error;
    }
    return handleServerActionError(error);
  }
}

async function _removeVoucherFromOrder(orderId: number) {
  const { supabase, userId, profile } = await getCashierProfile();

  // Get order — validate branch ownership
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, subtotal, status")
    .eq("id", orderId)
    .eq("branch_id", profile.branch_id!)
    .single();

  if (orderError || !order) return { error: "Đơn hàng không tồn tại" };
  if (order.status === "completed" || order.status === "cancelled") {
    return { error: "Không thể chỉnh sửa đơn đã hoàn tất/hủy" };
  }

  // Get voucher info before deletion for audit log
  const { data: voucherDiscount } = await supabase
    .from("order_discounts")
    .select("id, value, voucher_id, reason")
    .eq("order_id", orderId)
    .eq("type", "voucher")
    .maybeSingle();

  // Delete voucher discount
  const { error: deleteError } = await supabase
    .from("order_discounts")
    .delete()
    .eq("order_id", orderId)
    .eq("type", "voucher");

  if (deleteError) return { error: deleteError.message };

  // Recalculate totals without discount
  const { data: settings } = await supabase
    .from("system_settings")
    .select("key, value")
    .eq("tenant_id", profile.tenant_id)
    .in("key", ["tax_rate", "service_charge"]);

  const taxRate =
    Number(
      settings?.find((s) => s.key === "tax_rate")?.value ?? 10,
    ) / 100;
  const serviceChargeRate =
    Number(
      settings?.find((s) => s.key === "service_charge")?.value ?? 5,
    ) / 100;

  const newTax = Math.round(order.subtotal * taxRate);
  const newServiceCharge = Math.round(order.subtotal * serviceChargeRate);
  const newTotal = order.subtotal + newTax + newServiceCharge;

  await supabase
    .from("orders")
    .update({
      discount_total: 0,
      tax: newTax,
      service_charge: newServiceCharge,
      total: newTotal,
    })
    .eq("id", orderId);

  // Audit log: voucher removed
  await auditLog(supabase, {
    tenant_id: profile.tenant_id,
    user_id: userId,
    action: "voucher_removed",
    resource_type: "order_discount",
    resource_id: orderId,
    changes: {
      order_id: orderId,
      removed_discount_id: voucherDiscount?.id ?? null,
      removed_voucher_id: voucherDiscount?.voucher_id ?? null,
      removed_voucher_code: voucherDiscount?.reason ?? null,
      removed_discount_amount: voucherDiscount?.value ?? null,
      new_total: newTotal,
    },
  });

  revalidatePath("/pos/cashier");

  return { error: null, new_total: newTotal };
}

export async function removeVoucherFromOrder(orderId: number) {
  try {
    return await _removeVoucherFromOrder(orderId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) {
      throw error;
    }
    return handleServerActionError(error);
  }
}

// ===== Momo Payment =====

async function _createMomoPayment(orderId: number) {
  const { supabase, userId, profile } = await getCashierProfile();

  // Get active session
  const { data: session } = await supabase
    .from("pos_sessions")
    .select("id, terminal_id")
    .eq("cashier_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (!session) return { error: "Chưa mở ca." };

  // Get order — validate branch ownership
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, total, status")
    .eq("id", orderId)
    .eq("branch_id", profile.branch_id!)
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
    return { error: payErr.message };
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

export async function createMomoPayment(orderId: number) {
  try {
    return await _createMomoPayment(orderId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) {
      throw error;
    }
    return handleServerActionError(error);
  }
}

async function _checkPaymentStatus(paymentId: number) {
  const { supabase, profile } = await getCashierProfile();

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
    .eq("branch_id", profile.branch_id!)
    .single();

  if (!order) return { error: "Không tìm thấy giao dịch" };

  return {
    error: null,
    status: payment.status,
    reference_no: payment.reference_no,
    paid_at: payment.paid_at,
  };
}

export async function checkPaymentStatus(paymentId: number) {
  try {
    return await _checkPaymentStatus(paymentId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) {
      throw error;
    }
    return handleServerActionError(error);
  }
}

// ===== Cashier Order Queue =====

async function _getCashierOrders() {
  const { supabase, profile } = await getCashierProfile();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, type, subtotal, discount_total, total, created_at, table_id, tables(number), order_items(id, quantity, menu_items(name)), order_discounts(id, type, value, voucher_id, vouchers(code))",
    )
    .eq("branch_id", profile.branch_id!)
    .in("status", ["confirmed", "preparing", "ready", "served"])
    .order("created_at", { ascending: true });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export async function getCashierOrders() {
  try {
    return await _getCashierOrders();
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error);
  }
}
