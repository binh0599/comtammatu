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

// ===== Utilities =====
export {
  formatPrice,
  formatElapsedTime,
  formatDateTime,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getTerminalTypeLabel,
  getTableStatusLabel,
} from "./utils/format";
