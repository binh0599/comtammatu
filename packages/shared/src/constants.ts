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

// ===== Inventory =====

export const STOCK_MOVEMENT_TYPES = [
  "in",
  "out",
  "transfer",
  "waste",
  "adjust",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const WASTE_REASONS = [
  "expired",
  "spoiled",
  "overproduction",
  "other",
] as const;
export type WasteReason = (typeof WASTE_REASONS)[number];

// ===== Supplier / Purchase Orders =====

export const PO_STATUSES = [
  "draft",
  "sent",
  "received",
  "cancelled",
] as const;
export type PoStatus = (typeof PO_STATUSES)[number];

export const VALID_PO_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

// ===== HR =====

export const EMPLOYMENT_TYPES = ["full", "part", "contract"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYEE_STATUSES = [
  "active",
  "inactive",
  "on_leave",
  "terminated",
] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const LEAVE_TYPES = ["annual", "sick", "unpaid", "maternity"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const SHIFT_ASSIGNMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "no_show",
] as const;
export type ShiftAssignmentStatus =
  (typeof SHIFT_ASSIGNMENT_STATUSES)[number];

export const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "early_leave",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_SOURCES = [
  "qr",
  "manual",
  "pos_session",
  "terminal_login",
] as const;
export type AttendanceSource = (typeof ATTENDANCE_SOURCES)[number];

// ===== Security =====

export const SECURITY_SEVERITIES = ["info", "warning", "critical"] as const;
export type SecuritySeverity = (typeof SECURITY_SEVERITIES)[number];

// ===== CRM =====

export const CUSTOMER_GENDERS = ["M", "F", "Other"] as const;
export type CustomerGender = (typeof CUSTOMER_GENDERS)[number];

export const CUSTOMER_SOURCES = ["pos", "app", "website"] as const;
export type CustomerSource = (typeof CUSTOMER_SOURCES)[number];

export const LOYALTY_TRANSACTION_TYPES = [
  "earn",
  "redeem",
  "expire",
  "adjust",
] as const;
export type LoyaltyTransactionType =
  (typeof LOYALTY_TRANSACTION_TYPES)[number];

export const VOUCHER_TYPES = ["percent", "fixed", "free_item"] as const;
export type VoucherType = (typeof VOUCHER_TYPES)[number];

export const DISCOUNT_TYPES = ["percent", "fixed", "voucher"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const DELETION_REQUEST_STATUSES = [
  "pending",
  "cancelled",
  "completed",
] as const;
export type DeletionRequestStatus =
  (typeof DELETION_REQUEST_STATUSES)[number];

// ===== Module-Specific Role Sets =====

/** Roles allowed to manage inventory */
export const INVENTORY_ROLES = ["inventory", "manager", "owner"] as const;

/** Roles allowed to manage HR */
export const HR_ROLES = ["hr", "manager", "owner"] as const;

/** Roles allowed to view admin dashboard */
export const ADMIN_ROLES = ["owner", "manager"] as const;

/** Roles allowed to manage CRM */
export const CRM_ROLES = ["manager", "owner"] as const;
