// ===== Status Enums (match DB CHECK constraints) =====

export const ORDER_STATUSES = [
  "draft",
  "confirmed",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ITEM_STATUSES = [
  "pending",
  "sent_to_kds",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

export const ORDER_TYPES = ["dine_in", "takeaway", "delivery"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const PAYMENT_METHODS = ["cash", "card", "ewallet", "qr"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "completed",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TERMINAL_TYPES = ["mobile_order", "cashier_station"] as const;
export type TerminalType = (typeof TERMINAL_TYPES)[number];

export const SESSION_STATUSES = ["open", "closed", "suspended"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const KDS_TICKET_STATUSES = ["pending", "preparing", "ready"] as const;
export type KdsTicketStatus = (typeof KDS_TICKET_STATUSES)[number];

export const TABLE_STATUSES = [
  "available",
  "occupied",
  "reserved",
  "maintenance",
] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

// ===== Roles =====

export const STAFF_ROLES = [
  "owner",
  "manager",
  "cashier",
  "chef",
  "waiter",
  "inventory",
  "hr",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Roles allowed to access POS route group */
export const POS_ROLES = ["waiter", "cashier", "manager", "owner"] as const;

/** Roles allowed to process payments (cashier station) */
export const CASHIER_ROLES = ["cashier", "manager", "owner"] as const;

/** Roles allowed to access KDS */
export const KDS_ROLES = ["chef", "manager", "owner"] as const;

// ===== Valid Order Status Transitions =====

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["completed"],
  completed: [],
  cancelled: [],
};

// ===== Valid KDS Ticket Transitions =====

export const VALID_KDS_TRANSITIONS: Record<
  KdsTicketStatus,
  KdsTicketStatus[]
> = {
  pending: ["preparing"],
  preparing: ["ready"],
  ready: [],
};
