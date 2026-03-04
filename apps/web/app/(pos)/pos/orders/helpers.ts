import { VALID_ORDER_TRANSITIONS, type OrderStatus } from "@comtammatu/shared";

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  const allowed = VALID_ORDER_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

/**
 * Calculate order totals from items
 * Tax and service charge rates are percentages (e.g., 10 = 10%)
 */
export function calculateOrderTotals(
  items: { unit_price: number; quantity: number }[],
  taxRate: number,
  serviceChargeRate: number
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  const tax = Math.round(subtotal * (taxRate / 100));
  const serviceCharge = Math.round(subtotal * (serviceChargeRate / 100));
  const total = subtotal + tax + serviceCharge;

  return { subtotal, tax, serviceCharge, total };
}

/**
 * Release a table (set status to "available") only if there are no other
 * active orders on it.  This is critical for multi-order-per-table support
 * where two guests can share a physical table with independent orders.
 *
 * @param excludeOrderId - The order that just completed/cancelled; excluded
 *   from the "still active?" check.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function maybeReleaseTable(
  supabase: any,
  tableId: number,
  branchId: number,
  excludeOrderId: number
) {
  const activeStatuses = [
    "draft",
    "confirmed",
    "preparing",
    "ready",
    "served",
  ];

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("table_id", tableId)
    .eq("branch_id", branchId)
    .in("status", activeStatuses)
    .neq("id", excludeOrderId);

  if (!count || count === 0) {
    await supabase
      .from("tables")
      .update({ status: "available" })
      .eq("id", tableId)
      .eq("branch_id", branchId);
  }
}
