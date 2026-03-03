// Barrel re-export — CRM actions split into domain sub-modules.
// Consumers can continue importing from "./actions" without changes.

export {
  getBranches,
  getCustomers,
  createCustomer,
  updateCustomer,
  toggleCustomerActive,
  getCustomerLoyaltyHistory,
  adjustLoyaltyPoints,
} from "./customer-actions";

export {
  getLoyaltyTiers,
  createLoyaltyTier,
  updateLoyaltyTier,
  deleteLoyaltyTier,
} from "./loyalty-tier-actions";

export {
  getVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucher,
} from "./crm-voucher-actions";

export {
  getFeedback,
  respondToFeedback,
} from "./feedback-actions";

export {
  getCrmStats,
  type CrmStats,
} from "./stats-actions";
