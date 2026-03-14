"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  validateVoucherSchema,
  applyVoucherSchema,
  getActionContext,
  requireBranch,
  requireRole,
  withServerAction,
  auditLog,
  safeDbErrorResult,
  CASHIER_ROLES,
  getTaxRates,
} from "@comtammatu/shared";

// ---------------------------------------------------------------------------
// validateVoucher
// ---------------------------------------------------------------------------

async function _validateVoucher(data: { code: string; branch_id: number; subtotal: number }) {
  const ctx = await getActionContext();
  const serverBranchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thực hiện thao tác thu ngân");
  const { supabase, tenantId } = ctx;

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
      "id, code, type, value, min_order, max_discount, valid_from, valid_to, max_uses, used_count, is_active"
    )
    .eq("tenant_id", tenantId)
    .ilike("code", parsed.data.code)
    .maybeSingle();

  if (voucherError) return safeDbErrorResult(voucherError, "db");
  if (!voucher) return { error: "Mã voucher không tồn tại" };

  if (!voucher.is_active) return { error: "Voucher đã bị vô hiệu hóa" };

  const now = new Date();
  if (new Date(voucher.valid_from) > now) return { error: "Voucher chưa đến thời gian sử dụng" };
  if (new Date(voucher.valid_to) < now) return { error: "Voucher đã hết hạn" };

  if (voucher.max_uses !== null && voucher.used_count >= voucher.max_uses) {
    return { error: "Voucher đã hết lượt sử dụng" };
  }

  // Check branch scope
  const { data: voucherBranches } = await supabase
    .from("voucher_branches")
    .select("branch_id")
    .eq("voucher_id", voucher.id);

  if (voucherBranches && voucherBranches.length > 0) {
    const branchIds = voucherBranches.map((vb: { branch_id: number }) => vb.branch_id);
    if (!branchIds.includes(serverBranchId)) {
      return { error: "Voucher không áp dụng cho chi nhánh này" };
    }
  }

  // Check minimum order
  if (voucher.min_order !== null && parsed.data.subtotal < voucher.min_order) {
    return {
      error: `Đơn hàng tối thiểu ${new Intl.NumberFormat("vi-VN").format(voucher.min_order)}₫ để sử dụng voucher`,
    };
  }

  // Calculate discount
  let discountAmount = 0;
  if (voucher.type === "percent") {
    discountAmount = Math.round((parsed.data.subtotal * voucher.value) / 100);
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

export const validateVoucher = withServerAction(_validateVoucher);

// ---------------------------------------------------------------------------
// applyVoucherToOrder
// ---------------------------------------------------------------------------

async function _applyVoucherToOrder(data: { order_id: number; voucher_code: string }) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thực hiện thao tác thu ngân");
  const { supabase, userId, tenantId } = ctx;

  const parsed = applyVoucherSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  // Get order — validate branch ownership
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, subtotal, tax, service_charge, discount_total, total, status, branch_id")
    .eq("id", parsed.data.order_id)
    .eq("branch_id", branchId)
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

  if (validation.error !== null) return { error: validation.error };

  const discountAmount = validation.discount_amount ?? 0;

  // Insert order_discount
  const { error: discountError } = await supabase.from("order_discounts").insert({
    order_id: order.id,
    type: "voucher",
    value: discountAmount,
    reason: validation.code,
    applied_by: userId,
    voucher_id: validation.voucher_id,
  });

  if (discountError) return safeDbErrorResult(discountError, "db");

  // Recalculate order totals (tax/service on discounted subtotal)
  const { taxRate, serviceChargeRate } = await getTaxRates(supabase, tenantId);

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

  if (updateError) return safeDbErrorResult(updateError, "db");

  // Audit log: voucher applied
  await auditLog(supabase, {
    tenant_id: tenantId,
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

export const applyVoucherToOrder = withServerAction(_applyVoucherToOrder);

// ---------------------------------------------------------------------------
// removeVoucherFromOrder
// ---------------------------------------------------------------------------

async function _removeVoucherFromOrder(orderId: number) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thực hiện thao tác thu ngân");
  const { supabase, userId, tenantId } = ctx;

  // Get order — validate branch ownership
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, subtotal, status")
    .eq("id", orderId)
    .eq("branch_id", branchId)
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

  if (deleteError) return safeDbErrorResult(deleteError, "db");

  // Recalculate totals without discount
  const rates = await getTaxRates(supabase, tenantId);

  const newTax = Math.round(order.subtotal * rates.taxRate);
  const newServiceCharge = Math.round(order.subtotal * rates.serviceChargeRate);
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
    tenant_id: tenantId,
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

export const removeVoucherFromOrder = withServerAction(_removeVoucherFromOrder);
