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

export const PAYMENT_METHODS = ["cash", "card", "ewallet", "qr", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  ewallet: "Ví điện tử",
  qr: "QR (Momo)",
  transfer: "Chuyển khoản",
};

export const PAYMENT_STATUSES = [
  "pending",
  "completed",
  "failed",
  "refunded",
  "expired",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TERMINAL_TYPES = ["mobile_order", "cashier_station"] as const;
export type TerminalType = (typeof TERMINAL_TYPES)[number];

/** All device terminal types (derived from TERMINAL_TYPES + kds_station) */
export const DEVICE_TERMINAL_TYPES = [...TERMINAL_TYPES, "kds_station"] as const;
export type DeviceTerminalType = (typeof DEVICE_TERMINAL_TYPES)[number];

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

/** Roles that require device approval before accessing POS/KDS */
export const DEVICE_CHECK_ROLES = ["cashier", "waiter", "chef"] as const;

/** Mapping from staff role to post-login redirect path */
export const ROLE_REDIRECT_MAP: Record<string, string> = {
  owner: "/admin",
  manager: "/admin",
  cashier: "/pos",
  waiter: "/pos",
  chef: "/kds",
  hr: "/admin/hr",
};

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
  pending: ["preparing", "ready"],
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
  "partially_received",
  "received",
  "cancelled",
] as const;
export type PoStatus = (typeof PO_STATUSES)[number];

export const VALID_PO_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["partially_received", "received", "cancelled"],
  partially_received: ["received", "cancelled"],
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

// ===== Payroll =====

export const PAYROLL_STATUSES = ["draft", "calculated", "approved", "paid"] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export const VALID_PAYROLL_TRANSITIONS: Record<PayrollStatus, PayrollStatus[]> = {
  draft: ["calculated"],
  calculated: ["approved", "draft"],
  approved: ["paid", "calculated"],
  paid: [],
};

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

// ===== Menu =====

export const MENU_CATEGORY_TYPES = [
  "main_dish",
  "side_dish",
  "drink",
] as const;
export type MenuCategoryType = (typeof MENU_CATEGORY_TYPES)[number];

export const MENU_CATEGORY_TYPE_LABELS: Record<MenuCategoryType, string> = {
  main_dish: "Món chính",
  side_dish: "Món kèm",
  drink: "Nước",
};

// ===== Device Registration =====

export const DEVICE_STATUSES = ["pending", "approved", "rejected"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const DEVICE_TYPES = ["pos", "kds"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

/** Map user role → device type (pos or kds) */
export const ROLE_DEVICE_TYPE_MAP: Record<string, DeviceType> = {
  waiter: "pos",
  cashier: "pos",
  chef: "kds",
};

/** Map user role → terminal type for registered devices */
export const ROLE_TERMINAL_TYPE_MAP: Record<string, DeviceTerminalType | null> = {
  waiter: "mobile_order",
  cashier: "cashier_station",
  chef: "kds_station",
};

// ===== Printing =====

export const PRINTER_TYPES = [
  "thermal_usb",
  "thermal_network",
  "browser",
] as const;
export type PrinterType = (typeof PRINTER_TYPES)[number];

export const PAPER_WIDTHS = [58, 80] as const;
export type PaperWidth = (typeof PAPER_WIDTHS)[number];

export const PRINTER_TEST_STATUSES = [
  "connected",
  "error",
  "untested",
] as const;
export type PrinterTestStatus = (typeof PRINTER_TEST_STATUSES)[number];

export const PRINTER_ASSIGNED_TYPES = [
  "pos_terminal",
  "kds_station",
  "registered_device",
] as const;
export type PrinterAssignedType = (typeof PRINTER_ASSIGNED_TYPES)[number];

// ===== PO Quality Check =====

export const PO_QUALITY_STATUSES = [
  "pending",
  "accepted",
  "partial",
  "rejected",
] as const;
export type PoQualityStatus = (typeof PO_QUALITY_STATUSES)[number];

// ===== Stock Count =====

export const STOCK_COUNT_STATUSES = [
  "draft",
  "submitted",
  "approved",
] as const;
export type StockCountStatus = (typeof STOCK_COUNT_STATUSES)[number];

// ===== 86'd / Menu Availability Reasons =====

export const ITEM_UNAVAILABLE_REASONS = [
  "out_of_stock",
  "ingredient_shortage",
  "equipment_issue",
  "seasonal",
  "other",
] as const;
export type ItemUnavailableReason = (typeof ITEM_UNAVAILABLE_REASONS)[number];

// ===== Module-Specific Role Sets =====

/** Roles allowed to manage inventory */
export const INVENTORY_ROLES = ["inventory", "manager", "owner"] as const;

/** Roles allowed to manage HR */
export const HR_ROLES = ["hr", "manager", "owner"] as const;

/** Roles allowed to view admin dashboard */
export const ADMIN_ROLES = ["owner", "manager"] as const;

/** Roles allowed to access Employee Portal */
export const EMPLOYEE_PORTAL_ROLES = [...STAFF_ROLES] as const;

/** Roles allowed to manage CRM */
export const CRM_ROLES = ["manager", "owner"] as const;

// ===== Campaigns =====

export const CAMPAIGN_TYPES = ["email", "sms", "push"] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sent",
  "completed",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const NOTIFICATION_CHANNELS = [
  "in_app",
  "push",
  "email",
  "sms",
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// ===== Reservations =====

export const RESERVATION_STATUSES = ["pending", "confirmed", "seated", "no_show", "cancelled"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const TABLE_SECTIONS = ["Tầng 1", "Tầng 2", "Sân vườn", "VIP", "Ngoài trời"] as const;

// ===== Push Notifications =====

export const PUSH_NOTIFICATION_TYPES = [
  "order_status",
  "low_stock",
  "campaign",
  "reservation",
  "payment",
  "system",
] as const;
export type PushNotificationType = (typeof PUSH_NOTIFICATION_TYPES)[number];

export const PUSH_SUBSCRIPTION_STATUSES = ["active", "expired", "unsubscribed"] as const;
export type PushSubscriptionStatus = (typeof PUSH_SUBSCRIPTION_STATUSES)[number];
