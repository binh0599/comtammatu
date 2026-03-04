// Barrel re-export — order actions split into mutations and queries.
// Each sub-module has its own "use server" directive.
// Consumers can continue importing from "./actions" without changes.

export {
  createOrder,
  confirmOrder,
  updateOrderStatus,
  addOrderItems,
} from "./order-mutations";

export {
  getOrders,
  getOrderDetail,
  getTables,
  getTablesWithActiveOrders,
  getMenuItems,
  getMenuCategories,
} from "./order-queries";
