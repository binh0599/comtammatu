"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  requireBranch,
  requireRole,
  withServerQuery,
  safeDbError,
  CASHIER_ROLES,
} from "@comtammatu/shared";

async function _getCashierOrders() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, CASHIER_ROLES, "thực hiện thao tác thu ngân");
  const { supabase } = ctx;

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, type, subtotal, tax, discount_total, total, created_at, table_id, tables(number), order_items(id, quantity, unit_price, item_total, menu_items(name), menu_item_variants(name)), order_discounts(id, type, value, voucher_id)",
    )
    .eq("branch_id", branchId)
    .in("status", ["confirmed", "preparing", "ready", "served"])
    .order("created_at", { ascending: true });

  if (error) throw safeDbError(error, "db");
  if (!orders || orders.length === 0) return [];

  const voucherIds = new Set<number>();
  for (const order of orders) {
    for (const discount of order.order_discounts || []) {
      if (discount.type === "voucher" && discount.voucher_id) {
        voucherIds.add(discount.voucher_id);
      }
    }
  }

  if (voucherIds.size > 0) {
    const { batchFetch } = await import("@comtammatu/database");
    const vouchers = await batchFetch<{ code: string }>(
      supabase as any,
      "vouchers",
      Array.from(voucherIds),
      "id, code"
    );

    for (const order of orders) {
      for (const discount of order.order_discounts || []) {
        if (discount.type === "voucher" && discount.voucher_id) {
          const v = vouchers.get(discount.voucher_id);
          if (v) {
            (discount as any).vouchers = v;
          }
        }
      }
    }
  }

  return orders;
}

export const getCashierOrders = withServerQuery(_getCashierOrders);
