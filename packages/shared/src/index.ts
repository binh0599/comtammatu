// ===== Constants & Types =====
export {
  ORDER_STATUSES,
  ORDER_ITEM_STATUSES,
  ORDER_TYPES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
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
  EMPLOYEE_PORTAL_ROLES,
  // Week 7-8: CRM
  CUSTOMER_GENDERS,
  CUSTOMER_SOURCES,
  LOYALTY_TRANSACTION_TYPES,
  VOUCHER_TYPES,
  DELETION_REQUEST_STATUSES,
  CRM_ROLES,
  // Post-MVP
  DISCOUNT_TYPES,
  // Printing
  PRINTER_TYPES,
  PAPER_WIDTHS,
  PRINTER_TEST_STATUSES,
  PRINTER_ASSIGNED_TYPES,
  // Menu
  MENU_CATEGORY_TYPES,
  MENU_CATEGORY_TYPE_LABELS,
  // Device Registration
  DEVICE_STATUSES,
  DEVICE_CHECK_ROLES,
  ROLE_REDIRECT_MAP,
  DEVICE_TERMINAL_TYPES,
  DEVICE_TYPES,
  ROLE_DEVICE_TYPE_MAP,
  ROLE_TERMINAL_TYPE_MAP,
  // Payroll
  PAYROLL_STATUSES,
  VALID_PAYROLL_TRANSITIONS,
  // KDS Inventory
  ITEM_UNAVAILABLE_REASONS,
  // PO Quality & Stock Count
  PO_QUALITY_STATUSES,
  STOCK_COUNT_STATUSES,
  // Campaigns
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUSES,
  NOTIFICATION_CHANNELS,
  // Table Management
  RESERVATION_STATUSES,
  TABLE_SECTIONS,
  // Push Notifications
  PUSH_NOTIFICATION_TYPES,
  PUSH_SUBSCRIPTION_STATUSES,
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
  // Post-MVP
  DiscountType,
  // Printing
  PrinterType,
  PaperWidth,
  PrinterTestStatus,
  PrinterAssignedType,
  // Menu
  MenuCategoryType,
  // Device Registration
  DeviceStatus,
  DeviceTerminalType,
  DeviceType,
  // Payroll
  PayrollStatus,
  // KDS Inventory
  ItemUnavailableReason,
  // PO Quality & Stock Count
  PoQualityStatus,
  StockCountStatus,
  // Campaigns
  CampaignType,
  CampaignStatus,
  NotificationChannel,
  // Table Management
  ReservationStatus,
  // Push Notifications
  PushNotificationType,
  PushSubscriptionStatus,
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
  menuSchema,
  menuCategorySchema,
  menuItemSchema,
  menuItemAvailableSidesSchema,
  entityIdSchema,
} from "./schemas/menu";
export type {
  MenuInput,
  MenuCategoryInput,
  MenuItemInput,
  MenuItemAvailableSidesInput,
} from "./schemas/menu";

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

export {
  processPaymentSchema,
  bankTransferConfigSchema,
  paymentMethodsConfigSchema,
} from "./schemas/payment";
export type {
  ProcessPaymentInput,
  BankTransferConfig,
  PaymentMethodsConfig,
} from "./schemas/payment";

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
  toggleMenuItemAvailabilitySchema,
  quickWasteLogSchema,
  createStockCountSchema,
  approveStockCountSchema,
  prepListQuerySchema,
  expiringBatchesQuerySchema,
  foodCostQuerySchema,
  urgentRestockRequestSchema,
} from "./schemas/inventory";
export type {
  CreateIngredientInput,
  UpdateIngredientInput,
  CreateStockMovementInput,
  CreateRecipeInput,
  ToggleMenuItemAvailabilityInput,
  QuickWasteLogInput,
  CreateStockCountInput,
  ApproveStockCountInput,
  PrepListQueryInput,
  ExpiringBatchesQueryInput,
  FoodCostQueryInput,
  UrgentRestockRequestInput,
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
  createStaffAccountSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  createShiftSchema,
  createShiftAssignmentSchema,
  createLeaveRequestSchema,
  approveLeaveRequestSchema,
  // Employee self-service
  updateMyProfileSchema,
  changePasswordSchema,
  createMyLeaveRequestSchema,
  // Shared validation
  dateRangeSchema,
  limitSchema,
  daysSchema,
} from "./schemas/hr";
export type {
  CreateStaffAccountInput,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreateShiftInput,
  CreateShiftAssignmentInput,
  CreateLeaveRequestInput,
  ApproveLeaveRequestInput,
  // Employee self-service
  UpdateMyProfileInput,
  ChangePasswordInput,
  CreateMyLeaveRequestInput,
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
export {
  createVoucherSchema,
  updateVoucherSchema,
  validateVoucherSchema,
  applyVoucherSchema,
} from "./schemas/voucher";
export type {
  CreateVoucherInput,
  UpdateVoucherInput,
  ValidateVoucherInput,
  ApplyVoucherInput,
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

// Device Registration
export {
  registerDeviceSchema,
  approveDeviceSchema,
  rejectDeviceSchema,
  updateDeviceCategoriesSchema,
} from "./schemas/device";
export type {
  RegisterDeviceInput,
  ApproveDeviceInput,
  RejectDeviceInput,
  UpdateDeviceCategoriesInput,
} from "./schemas/device";

// Payroll
export {
  createPayrollPeriodSchema,
  payrollPeriodIdSchema,
  updatePayrollEntrySchema,
  isRealDate,
} from "./schemas/payroll";
export type {
  CreatePayrollPeriodInput,
  UpdatePayrollEntryInput,
} from "./schemas/payroll";

// Printing
export {
  createPrinterConfigSchema,
  updatePrinterConfigSchema,
  assignPrinterSchema,
  usbConnectionConfigSchema,
  networkConnectionConfigSchema,
} from "./schemas/printer";
export type {
  CreatePrinterConfigInput,
  UpdatePrinterConfigInput,
  AssignPrinterInput,
  UsbConnectionConfig,
  NetworkConnectionConfig,
} from "./schemas/printer";

// Dashboard
export { dashboardLimitSchema, dashboardDaysSchema } from "./schemas/dashboard";
export type { DashboardLimitInput, DashboardDaysInput } from "./schemas/dashboard";

// Campaign & Analytics (Phase 3)
export {
  createCampaignSchema,
  updateCampaignSchema,
  analyticsQuerySchema,
  forecastQuerySchema,
  staffPerformanceQuerySchema,
} from "./schemas/campaign";
export type {
  CreateCampaignInput,
  UpdateCampaignInput,
  AnalyticsQueryInput,
  ForecastQueryInput,
  StaffPerformanceQueryInput,
} from "./schemas/campaign";

// Table Management
export {
  createTableSchema,
  updateTableSchema,
  createReservationSchema,
} from "./schemas/table";
export type {
  CreateTableInput,
  UpdateTableInput,
  CreateReservationInput,
} from "./schemas/table";

// Push Notifications
export {
  subscribePushSchema,
  unsubscribePushSchema,
  sendPushNotificationSchema,
} from "./schemas/push-notification";
export type {
  SubscribePushInput,
  UnsubscribePushInput,
  SendPushNotificationInput,
} from "./schemas/push-notification";

// ===== Utilities =====
export {
  formatPrice,
  formatElapsedTime,
  formatDateTime,
  getOrderStatusLabel,
  getOrderTypeLabel,
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
  // Payment
  getPaymentStatusLabel,
  // Post-MVP
  getDiscountTypeLabel,
  formatDiscount,
  // Printing
  getPrinterTypeLabel,
  getPrinterTestStatusLabel,
  getPrinterAssignedTypeLabel,
  // Device Registration
  getDeviceStatusLabel,
  // Payroll
  getPayrollStatusLabel,
  // KDS Inventory
  getItemUnavailableReasonLabel,
  // PO Quality & Stock Count
  getPoQualityStatusLabel,
  getStockCountStatusLabel,
  // Campaigns
  getCampaignTypeLabel,
  getCampaignStatusLabel,
  getNotificationChannelLabel,
  // Table Management
  getReservationStatusLabel,
  // Push Notifications
  getPushNotificationTypeLabel,
} from "./utils/format";

// ===== Error Handling =====
export {
  ActionError,
  handleServerActionError,
  requireRole,
  safeDbError,
  safeDbErrorResult,
} from "./utils/errors";
export type { ActionErrorCode, ActionResult } from "./utils/errors";

// ===== Server Helpers (import only in server-side code) =====
export {
  getAuthenticatedProfile,
  verifyBranchOwnership,
  verifyTenantOwnership,
} from "./server/auth-helpers";

export { auditLog, logSecurityEvent } from "./server/audit-helpers";
export type { AuditLogEntry, SecurityEventEntry } from "./server/audit-helpers";

export {
  getActionContext,
  getAdminContext,
  getKdsBranchContext,
  getBranchesForTenant,
  getBranchIdsForTenant,
  verifyEntityOwnership,
  configureActionContext,
  requireBranch,
} from "./server/action-context";
export type { ActionContext, KdsContext } from "./server/action-context";

export { withServerAction, withServerQuery } from "./server/with-server-action";
