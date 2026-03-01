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
