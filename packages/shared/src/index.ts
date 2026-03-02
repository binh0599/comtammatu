// ===== Constants & Types =====
export {
  ORDER_STATUSES,
  ORDER_ITEM_STATUSES,
  ORDER_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TERMINAL_TYPES,
  SESSION_STATUSES,
  KDS_TICKET_STATUSES,
  TABLE_STATUSES,
  STAFF_ROLES,
  POS_ROLES,
  CASHIER_ROLES,
  KDS_ROLES,
  VALID_ORDER_TRANSITIONS,
  VALID_KDS_TRANSITIONS,
  // Week 5-6
  STOCK_MOVEMENT_TYPES,
  WASTE_REASONS,
  PO_STATUSES,
  VALID_PO_TRANSITIONS,
  EMPLOYMENT_TYPES,
  EMPLOYEE_STATUSES,
  LEAVE_TYPES,
  LEAVE_STATUSES,
  SHIFT_ASSIGNMENT_STATUSES,
  ATTENDANCE_STATUSES,
  ATTENDANCE_SOURCES,
  SECURITY_SEVERITIES,
  INVENTORY_ROLES,
  HR_ROLES,
  ADMIN_ROLES,
  // Week 7-8: CRM
  CUSTOMER_GENDERS,
  CUSTOMER_SOURCES,
  LOYALTY_TRANSACTION_TYPES,
  VOUCHER_TYPES,
  DELETION_REQUEST_STATUSES,
  CRM_ROLES,
} from "./constants";

export type {
  OrderStatus,
  OrderItemStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  TerminalType,
  SessionStatus,
  KdsTicketStatus,
  TableStatus,
  StaffRole,
  // Week 5-6
  StockMovementType,
  WasteReason,
  PoStatus,
  EmploymentType,
  EmployeeStatus,
  LeaveType,
  LeaveStatus,
  ShiftAssignmentStatus,
  AttendanceStatus,
  AttendanceSource,
  SecuritySeverity,
  // Week 7-8: CRM
  CustomerGender,
  CustomerSource,
  LoyaltyTransactionType,
  VoucherType,
  DeletionRequestStatus,
} from "./constants";

// ===== Zod Schemas =====
export {
  createOrderSchema,
  updateOrderStatusSchema,
  addOrderItemsSchema,
} from "./schemas/order";
export type {
  CreateOrderInput,
  UpdateOrderStatusInput,
  AddOrderItemsInput,
} from "./schemas/order";

export {
  registerTerminalSchema,
  openSessionSchema,
  closeSessionSchema,
} from "./schemas/pos";
export type {
  RegisterTerminalInput,
  OpenSessionInput,
  CloseSessionInput,
} from "./schemas/pos";

export { processPaymentSchema } from "./schemas/payment";
export type { ProcessPaymentInput } from "./schemas/payment";

export {
  createKdsStationSchema,
  updateKdsStationSchema,
  bumpTicketSchema,
} from "./schemas/kds";
export type {
  CreateKdsStationInput,
  UpdateKdsStationInput,
  BumpTicketInput,
} from "./schemas/kds";

// Week 5-6: Inventory
export {
  createIngredientSchema,
  updateIngredientSchema,
  createStockMovementSchema,
  createRecipeSchema,
} from "./schemas/inventory";
export type {
  CreateIngredientInput,
  UpdateIngredientInput,
  CreateStockMovementInput,
  CreateRecipeInput,
} from "./schemas/inventory";

// Week 5-6: Supplier
export {
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
} from "./schemas/supplier";
export type {
  CreateSupplierInput,
  UpdateSupplierInput,
  CreatePurchaseOrderInput,
  ReceivePurchaseOrderInput,
} from "./schemas/supplier";

// Week 5-6: HR
export {
  createEmployeeSchema,
  updateEmployeeSchema,
  createShiftSchema,
  createShiftAssignmentSchema,
  createLeaveRequestSchema,
  approveLeaveRequestSchema,
} from "./schemas/hr";
export type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreateShiftInput,
  CreateShiftAssignmentInput,
  CreateLeaveRequestInput,
  ApproveLeaveRequestInput,
} from "./schemas/hr";

// Week 7-8: CRM
export {
  createCustomerSchema,
  updateCustomerSchema,
  createLoyaltyTierSchema,
  updateLoyaltyTierSchema,
  adjustLoyaltyPointsSchema,
} from "./schemas/crm";
export type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateLoyaltyTierInput,
  UpdateLoyaltyTierInput,
  AdjustLoyaltyPointsInput,
} from "./schemas/crm";

// Week 7-8: Voucher
export { createVoucherSchema, updateVoucherSchema } from "./schemas/voucher";
export type {
  CreateVoucherInput,
  UpdateVoucherInput,
} from "./schemas/voucher";

// Week 7-8: Feedback
export {
  createFeedbackSchema,
  respondFeedbackSchema,
} from "./schemas/feedback";
export type {
  CreateFeedbackInput,
  RespondFeedbackInput,
} from "./schemas/feedback";

// Week 7-8: Privacy
export { deletionRequestSchema } from "./schemas/privacy";
export type { DeletionRequestInput } from "./schemas/privacy";

// ===== Utilities =====
export {
  formatPrice,
  formatElapsedTime,
  formatDateTime,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getTerminalTypeLabel,
  getTableStatusLabel,
  // Week 5-6
  formatDate,
  formatTime,
  getStockMovementTypeLabel,
  getWasteReasonLabel,
  getPoStatusLabel,
  getEmploymentTypeLabel,
  getEmployeeStatusLabel,
  getLeaveTypeLabel,
  getLeaveStatusLabel,
  getSeverityLabel,
  getAttendanceStatusLabel,
  getShiftAssignmentStatusLabel,
  // Week 7-8: CRM
  getCustomerGenderLabel,
  getCustomerSourceLabel,
  getLoyaltyTransactionTypeLabel,
  getVoucherTypeLabel,
  getDeletionStatusLabel,
  formatPoints,
} from "./utils/format";
