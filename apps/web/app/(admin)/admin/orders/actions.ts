"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { ADMIN_ROLES } from "@comtammatu/shared";

// --- Helper: Get tenant_id + role from authenticated user ---

async function getAdminContext() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.tenant_id;
  const role = profile?.role;
  if (!tenantId) throw new Error("No tenant assigned");
  if (!role || !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
    throw new Error("Insufficient permissions");
  }

  return { supabase, tenantId, userId: user.id, role };
}

// =====================
// Branches
// =====================

export async function getBranches() {
  const { supabase, tenantId } = await getAdminContext();

  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

// =====================
// Admin Orders (all branches, tenant-scoped)
// =====================

export async function getAdminOrders() {
  const { supabase, tenantId } = await getAdminContext();

  // Get all branch IDs for this tenant
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", tenantId);

  if (branchError) throw new Error(branchError.message);
  if (!branches || branches.length === 0) return [];

  const branchIds = branches.map((b) => b.id);

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
