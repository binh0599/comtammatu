"use server";

import "@/lib/server-bootstrap";
import {
  ADMIN_ROLES,
  getAdminContext,
  getBranchesForTenant,
  getBranchIdsForTenant,
  withServerQuery,
} from "@comtammatu/shared";

// =====================
// Branches
// =====================

async function _getBranches() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);
  return getBranchesForTenant(supabase, tenantId);
}

export const getBranches = withServerQuery(_getBranches);

// =====================
// Admin Orders (all branches, tenant-scoped)
// =====================

async function _getAdminOrders() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return [];

  // Get orders with related data
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      branch_id,
      type,
      status,
      subtotal,
      tax,
      service_charge,
      discount_total,
      total,
      notes,
      customer_id,
      table_id,
      created_by,
      created_at,
      updated_at,
      branches(id, name),
      order_items(id, menu_item_id, quantity, unit_price, item_total, status, notes, menu_items(name)),
      payments(id, method, status, amount, paid_at)
    `
    )
    .in("branch_id", branchIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getAdminOrders = withServerQuery(_getAdminOrders);
