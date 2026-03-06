"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  KDS_ROLES,
  handleServerActionError,
  getKdsBranchContext,
  safeDbError,
  safeDbErrorResult,
  toggleMenuItemAvailabilitySchema,
  quickWasteLogSchema,
  urgentRestockRequestSchema,
} from "@comtammatu/shared";

// ===== Portion Counter =====

export interface MenuPortionInfo {
  menu_item_id: number;
  menu_item_name: string;
  category_id: number;
  portions_remaining: number;
  limiting_ingredient_id: number | null;
  limiting_ingredient_name: string | null;
  is_available_global: boolean;
  is_available_branch: boolean;
}

async function _getMenuPortions(): Promise<MenuPortionInfo[]> {
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  const { data, error } = await supabase.rpc("calculate_menu_portions", {
    p_branch_id: profile.branch_id,
  });

  if (error) throw safeDbError(error, "db");
  return (data ?? []) as MenuPortionInfo[];
}

export async function getMenuPortions(): Promise<MenuPortionInfo[]> {
  try {
    return await _getMenuPortions();
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

// ===== 86'd Toggle — Branch-level Menu Item Availability =====

async function _toggleMenuItemAvailability(
  menuItemId: number,
  isAvailable: boolean,
  reason?: string,
) {
  const { supabase, profile, userId } = await getKdsBranchContext(KDS_ROLES);

  // Verify menu item belongs to tenant
  const { data: menuItem, error: menuItemError } = await supabase
    .from("menu_items")
    .select("id, tenant_id")
    .eq("id", menuItemId)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (menuItemError || !menuItem) {
    return { error: "Món ăn không tồn tại hoặc không thuộc hệ thống" };
  }

  // Upsert the branch availability record
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("menu_item_branch_availability")
    .upsert(
      {
        menu_item_id: menuItemId,
        branch_id: profile.branch_id,
        is_available: isAvailable,
        reason: isAvailable ? null : (reason || null),
        disabled_by: isAvailable ? null : userId,
        disabled_at: isAvailable ? null : now,
        updated_at: now,
      },
      { onConflict: "menu_item_id,branch_id" },
    );

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/kds");
  revalidatePath("/pos/orders");
  revalidatePath("/customer/menu");
  return { error: null };
}

export async function toggleMenuItemAvailability(
  menuItemId: number,
  isAvailable: boolean,
  reason?: string,
) {
  const parsed = toggleMenuItemAvailabilitySchema.safeParse({
    menu_item_id: menuItemId,
    is_available: isAvailable,
    reason,
  });
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ" };
  }

  try {
    return await _toggleMenuItemAvailability(
      parsed.data.menu_item_id,
      parsed.data.is_available,
      parsed.data.reason || undefined,
    );
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

// ===== Quick Waste Log =====

export interface IngredientOption {
  id: number;
  name: string;
  unit: string;
  category: string | null;
}

async function _getIngredients(): Promise<IngredientOption[]> {
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  const { data, error } = await supabase
    .from("ingredients")
    .select("id, name, unit, category")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("name");

  if (error) throw safeDbError(error, "db");
  return (data ?? []) as IngredientOption[];
}

export async function getIngredients(): Promise<IngredientOption[]> {
  try {
    return await _getIngredients();
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

async function _logWaste(
  ingredientId: number,
  quantity: number,
  reason: "expired" | "spoiled" | "overproduction" | "other",
  notes?: string,
) {
  const { supabase, profile, userId } = await getKdsBranchContext(KDS_ROLES);

  // Verify ingredient belongs to tenant
  const { data: ingredient, error: ingError } = await supabase
    .from("ingredients")
    .select("id, tenant_id")
    .eq("id", ingredientId)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (ingError || !ingredient) {
    return { error: "Nguyên liệu không tồn tại" };
  }

  // 1. Insert waste_log record
  const { error: wasteError } = await supabase.from("waste_logs").insert({
    ingredient_id: ingredientId,
    branch_id: profile.branch_id,
    quantity,
    reason,
    notes: notes || null,
    logged_by: userId,
  });

  if (wasteError) return safeDbErrorResult(wasteError, "db");

  // 2. Insert stock_movement record (type='waste')
  const { error: movementError } = await supabase
    .from("stock_movements")
    .insert({
      ingredient_id: ingredientId,
      branch_id: profile.branch_id,
      type: "waste",
      quantity,
      notes: `Hao hụt: ${reason}${notes ? ` — ${notes}` : ""}`,
      created_by: userId,
    });

  if (movementError) return safeDbErrorResult(movementError, "db");

  // 3. Deduct from stock_levels (optimistic locking)
  const { data: currentStock } = await supabase
    .from("stock_levels")
    .select("id, quantity, version")
    .eq("ingredient_id", ingredientId)
    .eq("branch_id", profile.branch_id)
    .single();

  if (currentStock) {
    const newQty = Math.max(0, Number(currentStock.quantity) - quantity);
    const { error: updateError } = await supabase
      .from("stock_levels")
      .update({
        quantity: newQty,
        version: currentStock.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentStock.id)
      .eq("version", currentStock.version);

    if (updateError) return safeDbErrorResult(updateError, "db");
  }

  revalidatePath("/kds");
  revalidatePath("/admin/inventory");
  return { error: null };
}

export async function logWaste(
  ingredientId: number,
  quantity: number,
  reason: "expired" | "spoiled" | "overproduction" | "other",
  notes?: string,
) {
  const parsed = quickWasteLogSchema.safeParse({
    ingredient_id: ingredientId,
    quantity,
    reason,
    notes,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  try {
    return await _logWaste(
      parsed.data.ingredient_id,
      parsed.data.quantity,
      parsed.data.reason,
      parsed.data.notes || undefined,
    );
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

// ===== Prep List (KDS) =====

export interface PrepListItem {
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  total_needed: number;
  current_stock: number;
  to_prep: number;
  menu_items_using: { id: number; name: string }[];
}

async function _getPrepList(targetPortions?: number): Promise<PrepListItem[]> {
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  const { data, error } = await supabase.rpc("calculate_prep_list", {
    p_branch_id: profile.branch_id,
    p_target_portions: targetPortions ?? 0,
  });

  if (error) throw safeDbError(error, "db");
  return (data ?? []) as PrepListItem[];
}

export async function getPrepList(
  targetPortions?: number,
): Promise<PrepListItem[]> {
  try {
    return await _getPrepList(targetPortions);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

// ===== Expiry Alerts (KDS) =====

export interface ExpiringBatch {
  id: number;
  ingredient_id: number;
  quantity: number;
  expiry_date: string;
  ingredients: { name: string; unit: string } | null;
}

async function _getExpiringBatches(
  daysAhead: number = 3,
): Promise<ExpiringBatch[]> {
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from("stock_batches")
    .select("id, ingredient_id, quantity, expiry_date, ingredients(name, unit)")
    .eq("branch_id", profile.branch_id)
    .gt("quantity", 0)
    .not("expiry_date", "is", null)
    .lte("expiry_date", futureDate.toISOString().split("T")[0])
    .order("expiry_date", { ascending: true });

  if (error) throw safeDbError(error, "db");
  return (data ?? []) as ExpiringBatch[];
}

export async function getExpiringBatches(
  daysAhead?: number,
): Promise<ExpiringBatch[]> {
  try {
    return await _getExpiringBatches(daysAhead);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

// ===== Urgent Restock Request =====

export interface SupplierOption {
  id: number;
  name: string;
}

async function _getSuppliers(): Promise<SupplierOption[]> {
  const { supabase, profile } = await getKdsBranchContext(KDS_ROLES);

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("name");

  if (error) throw safeDbError(error, "db");
  return (data ?? []) as SupplierOption[];
}

export async function getSuppliers(): Promise<SupplierOption[]> {
  try {
    return await _getSuppliers();
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

async function _requestUrgentRestock(input: {
  supplier_id: number;
  items: { ingredient_id: number; quantity: number }[];
  notes?: string;
}) {
  const { supabase, profile, userId } = await getKdsBranchContext(KDS_ROLES);

  const total = 0; // Chef doesn't know prices; admin fills in later

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      tenant_id: profile.tenant_id,
      supplier_id: input.supplier_id,
      branch_id: profile.branch_id,
      created_by: userId,
      status: "draft",
      total,
      notes: `[KHẨN CẤP - Yêu cầu từ bếp] ${input.notes || ""}`.trim(),
    })
    .select("id")
    .single();

  if (poError) return safeDbErrorResult(poError, "db");

  const itemRows = input.items.map((item) => ({
    po_id: po.id,
    ingredient_id: item.ingredient_id,
    quantity: item.quantity,
    unit_price: 0,
    received_qty: 0,
  }));

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(itemRows);

  if (itemsError) {
    const { error: cleanupError } = await supabase
      .from("purchase_orders")
      .delete()
      .eq("id", po.id);
    if (cleanupError) {
      return { error: `Lỗi tạo mục PO và không thể dọn dẹp PO #${po.id}: ${cleanupError.message}` };
    }
    return safeDbErrorResult(itemsError, "db");
  }

  revalidatePath("/admin/inventory");
  return { error: null, po_id: po.id };
}

export async function requestUrgentRestock(input: {
  supplier_id: number;
  items: { ingredient_id: number; quantity: number }[];
  notes?: string;
}) {
  const parsed = urgentRestockRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  try {
    return await _requestUrgentRestock(parsed.data);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}
