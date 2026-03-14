// Barrel re-export — all inventory actions split into domain sub-modules.
// Each sub-module has its own "use server" directive.
// Consumers can continue importing from "./actions" without changes.

export {
  getIngredients,
  getBranches,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from "./ingredient-actions";

export {
  getStockLevels,
  initStockLevel,
  getStockMovements,
  createStockMovement,
  createBranchTransfer,
} from "./stock-actions";

export { getRecipes, getMenuItemsForRecipe, createRecipe, deleteRecipe } from "./recipe-actions";

export {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierAnalytics,
  getReorderSuggestions,
} from "./supplier-actions";
export type { SupplierAnalytic, ReorderSuggestion } from "./supplier-actions";

export {
  getPurchaseOrders,
  createPurchaseOrder,
  sendPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from "./purchase-order-actions";

export {
  getPrepList,
  getFoodCostReport,
  getStockCounts,
  createStockCount,
  approveStockCount,
  getExpiringBatches,
  getPriceAnomalies,
} from "./inventory-ops-actions";
