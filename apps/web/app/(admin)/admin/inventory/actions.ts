"use server";

import {
  ActionError,
  VALID_PO_TRANSITIONS,
  type PoStatus,
  createIngredientSchema,
  createStockMovementSchema,
  createRecipeSchema,
  createSupplierSchema,
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
} from "@comtammatu/shared";
import { getActionContext } from "@comtammatu/shared/src/server/action-context";
import { withServerAction, withServerQuery } from "@comtammatu/shared/src/server/with-server-action";
import { revalidatePath } from "next/cache";

// =====================
// Ingredients
// =====================

async function _getIngredients() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getIngredients = withServerQuery(_getIngredients);

async function _getBranches() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getBranches = withServerQuery(_getBranches);

async function _createIngredient(formData: FormData) {
  const parsed = createIngredientSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    min_stock: formData.get("min_stock") || undefined,
    max_stock: formData.get("max_stock") || undefined,
    cost_price: formData.get("cost_price") || undefined,
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase.from("ingredients").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    sku: parsed.data.sku || null,
    unit: parsed.data.unit,
    category: parsed.data.category || null,
    min_stock: parsed.data.min_stock ?? null,
    max_stock: parsed.data.max_stock ?? null,
    cost_price: parsed.data.cost_price ?? null,
    is_active: parsed.data.is_active,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "SKU đã tồn tại" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const createIngredient = withServerAction(_createIngredient);

async function _updateIngredient(id: number, formData: FormData) {
  const parsed = createIngredientSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    min_stock: formData.get("min_stock") || undefined,
    max_stock: formData.get("max_stock") || undefined,
    cost_price: formData.get("cost_price") || undefined,
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("ingredients")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      unit: parsed.data.unit,
      category: parsed.data.category || null,
      min_stock: parsed.data.min_stock ?? null,
      max_stock: parsed.data.max_stock ?? null,
      cost_price: parsed.data.cost_price ?? null,
      is_active: parsed.data.is_active,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const updateIngredient = withServerAction(_updateIngredient);

async function _deleteIngredient(id: number) {
  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("ingredients")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const deleteIngredient = withServerAction(_deleteIngredient);

// =====================
// Stock Levels
// =====================

async function _getStockLevels() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("stock_levels")
    .select("*, ingredients!inner(name, unit, min_stock, max_stock, tenant_id), branches!inner(name)")
    .eq("ingredients.tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getStockLevels = withServerQuery(_getStockLevels);

async function _initStockLevel(data: {
  ingredient_id: number;
  branch_id: number;
  quantity: number;
}) {
  const { supabase } = await getActionContext();

  const { error } = await supabase.from("stock_levels").insert({
    ingredient_id: data.ingredient_id,
    branch_id: data.branch_id,
    quantity: data.quantity,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Tồn kho cho nguyên liệu này tại chi nhánh đã tồn tại" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const initStockLevel = withServerAction(_initStockLevel);

// =====================
// Stock Movements
// =====================

async function _getStockMovements() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("stock_movements")
    .select("*, ingredients!inner(name, unit, tenant_id), branches!inner(name), profiles(full_name)")
    .eq("ingredients.tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getStockMovements = withServerQuery(_getStockMovements);

async function _createStockMovement(data: {
  ingredient_id: number;
  branch_id: number;
  type: string;
  quantity: number;
  notes?: string;
}) {
  const parsed = createStockMovementSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, userId } = await getActionContext();

  const { error: movError } = await supabase.from("stock_movements").insert({
    ingredient_id: parsed.data.ingredient_id,
    branch_id: parsed.data.branch_id,
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    notes: parsed.data.notes || null,
    created_by: userId,
    cost_at_time: parsed.data.cost_at_time ?? null,
  });

  if (movError) return { error: movError.message };

  const { data: existing } = await supabase
    .from("stock_levels")
    .select("id, quantity, version")
    .eq("ingredient_id", parsed.data.ingredient_id)
    .eq("branch_id", parsed.data.branch_id)
    .single();

  const isAddition = parsed.data.type === "in" || parsed.data.type === "adjust";
  const delta = isAddition ? parsed.data.quantity : -parsed.data.quantity;

  if (existing) {
    const newQty = Math.max(0, existing.quantity + delta);
    const { error: updateError } = await supabase
      .from("stock_levels")
      .update({ quantity: newQty, version: existing.version + 1 })
      .eq("id", existing.id)
      .eq("version", existing.version);

    if (updateError) return { error: updateError.message };
  } else {
    const initQty = Math.max(0, delta);
    const { error: insertError } = await supabase.from("stock_levels").insert({
      ingredient_id: parsed.data.ingredient_id,
      branch_id: parsed.data.branch_id,
      quantity: initQty,
    });

    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const createStockMovement = withServerAction(_createStockMovement);

// =====================
// Recipes
// =====================

async function _getRecipes() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("recipes")
    .select("*, menu_items!inner(name, tenant_id), recipe_ingredients(*, ingredients(name, unit))")
    .eq("menu_items.tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getRecipes = withServerQuery(_getRecipes);

async function _getMenuItemsForRecipe() {
  const { supabase, tenantId } = await getActionContext();

  const { data: allItems, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_available", true)
    .order("name");

  if (itemsError) throw new ActionError(itemsError.message, "SERVER_ERROR", 500);

  const { data: existingRecipes, error: recipesError } = await supabase
    .from("recipes")
    .select("menu_item_id, menu_items!inner(tenant_id)")
    .eq("menu_items.tenant_id", tenantId);

  if (recipesError) throw new ActionError(recipesError.message, "SERVER_ERROR", 500);

  const usedIds = new Set(existingRecipes?.map((r) => r.menu_item_id) ?? []);
  return (allItems ?? []).filter((item) => !usedIds.has(item.id));
}

export const getMenuItemsForRecipe = withServerQuery(_getMenuItemsForRecipe);

async function _createRecipe(data: {
  menu_item_id: number;
  yield_qty?: number;
  yield_unit?: string;
  ingredients: {
    ingredient_id: number;
    quantity: number;
    unit: string;
    waste_pct?: number;
  }[];
}) {
  const parsed = createRecipeSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase } = await getActionContext();

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      menu_item_id: parsed.data.menu_item_id,
      yield_qty: parsed.data.yield_qty ?? null,
      yield_unit: parsed.data.yield_unit || null,
    })
    .select("id")
    .single();

  if (recipeError) {
    if (recipeError.code === "23505") {
      return { error: "Món này đã có công thức" };
    }
    return { error: recipeError.message };
  }

  const ingredientRows = parsed.data.ingredients.map((ing) => ({
    recipe_id: recipe.id,
    ingredient_id: ing.ingredient_id,
    quantity: ing.quantity,
    unit: ing.unit,
    waste_pct: ing.waste_pct ?? 0,
  }));

  const { error: ingError } = await supabase
    .from("recipe_ingredients")
    .insert(ingredientRows);

  if (ingError) {
    await supabase.from("recipes").delete().eq("id", recipe.id);
    return { error: ingError.message };
  }

  // Calculate total_cost if possible
  const ingredientIds = parsed.data.ingredients.map((i) => i.ingredient_id);
  const { data: costs } = await supabase
    .from("ingredients")
    .select("id, cost_price")
    .in("id", ingredientIds);

  if (costs && costs.length > 0) {
    const costMap = new Map(costs.map((c) => [c.id, c.cost_price ?? 0]));
    let totalCost = 0;
    for (const ing of parsed.data.ingredients) {
      const costPrice = costMap.get(ing.ingredient_id) ?? 0;
      const wasteFactor = 1 + (ing.waste_pct ?? 0) / 100;
      totalCost += costPrice * ing.quantity * wasteFactor;
    }

    if (totalCost > 0) {
      await supabase
        .from("recipes")
        .update({ total_cost: Math.round(totalCost * 100) / 100 })
        .eq("id", recipe.id);
    }
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const createRecipe = withServerAction(_createRecipe);

async function _deleteRecipe(id: number) {
  const { supabase } = await getActionContext();

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const deleteRecipe = withServerAction(_deleteRecipe);

// =====================
// Suppliers
// =====================

async function _getSuppliers() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getSuppliers = withServerQuery(_getSuppliers);

async function _createSupplier(formData: FormData) {
  const parsed = createSupplierSchema.safeParse({
    name: formData.get("name"),
    contact_name: formData.get("contact_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    payment_terms: formData.get("payment_terms"),
    rating: formData.get("rating") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase.from("suppliers").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    contact_name: parsed.data.contact_name || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    payment_terms: parsed.data.payment_terms || null,
    rating: parsed.data.rating ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Nhà cung cấp đã tồn tại" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const createSupplier = withServerAction(_createSupplier);

async function _updateSupplier(id: number, formData: FormData) {
  const parsed = createSupplierSchema.safeParse({
    name: formData.get("name"),
    contact_name: formData.get("contact_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    payment_terms: formData.get("payment_terms"),
    rating: formData.get("rating") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("suppliers")
    .update({
      name: parsed.data.name,
      contact_name: parsed.data.contact_name || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      payment_terms: parsed.data.payment_terms || null,
      rating: parsed.data.rating ?? null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const updateSupplier = withServerAction(_updateSupplier);

async function _deleteSupplier(id: number) {
  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    if (error.code === "23503") {
      return { error: "Không thể xóa — nhà cung cấp này đang có đơn mua hàng" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const deleteSupplier = withServerAction(_deleteSupplier);

// =====================
// Purchase Orders
// =====================

async function _getPurchaseOrders() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, suppliers(name), branches(name), purchase_order_items(*, ingredients(name, unit))")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getPurchaseOrders = withServerQuery(_getPurchaseOrders);

async function _createPurchaseOrder(input: {
  supplier_id: number;
  branch_id: number;
  expected_at?: string;
  notes?: string;
  items: { ingredient_id: number; quantity: number; unit_price: number }[];
}) {
  const parsed = createPurchaseOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getActionContext();

  const total = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      tenant_id: tenantId,
      supplier_id: parsed.data.supplier_id,
      branch_id: parsed.data.branch_id,
      created_by: userId,
      status: "draft",
      total: Math.round(total * 100) / 100,
      expected_at: parsed.data.expected_at || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (poError) return { error: poError.message };

  const itemRows = parsed.data.items.map((item) => ({
    po_id: po.id,
    ingredient_id: item.ingredient_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    received_qty: 0,
  }));

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(itemRows);

  if (itemsError) {
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    return { error: itemsError.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const createPurchaseOrder = withServerAction(_createPurchaseOrder);

async function _sendPurchaseOrder(id: number) {
  const { supabase, tenantId } = await getActionContext();

  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!po) return { error: "Đơn mua hàng không tồn tại" };

  const validNextStatuses = VALID_PO_TRANSITIONS[po.status as PoStatus];
  if (!validNextStatuses || !validNextStatuses.includes("sent")) {
    return { error: `Không thể gửi đơn ở trạng thái "${po.status}"` };
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "sent", ordered_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const sendPurchaseOrder = withServerAction(_sendPurchaseOrder);

async function _receivePurchaseOrder(input: {
  po_id: number;
  items: { po_item_id: number; received_qty: number }[];
}) {
  const parsed = receivePurchaseOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getActionContext();

  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status, branch_id")
    .eq("id", parsed.data.po_id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!po) return { error: "Đơn mua hàng không tồn tại" };

  const validNextStatuses = VALID_PO_TRANSITIONS[po.status as PoStatus];
  if (!validNextStatuses || !validNextStatuses.includes("received")) {
    return { error: `Không thể nhận hàng ở trạng thái "${po.status}"` };
  }

  for (const item of parsed.data.items) {
    const { error: itemError } = await supabase
      .from("purchase_order_items")
      .update({ received_qty: item.received_qty })
      .eq("id", item.po_item_id);

    if (itemError) return { error: itemError.message };
  }

  const { error: poError } = await supabase
    .from("purchase_orders")
    .update({ status: "received", received_at: new Date().toISOString() })
    .eq("id", parsed.data.po_id)
    .eq("tenant_id", tenantId);

  if (poError) return { error: poError.message };

  const poItemIds = parsed.data.items.map((i) => i.po_item_id);
  const { data: poItems, error: poItemsError } = await supabase
    .from("purchase_order_items")
    .select("id, ingredient_id")
    .in("id", poItemIds);

  if (poItemsError) return { error: poItemsError.message };

  const ingredientMap = new Map(
    (poItems ?? []).map((pi) => [pi.id, pi.ingredient_id])
  );

  for (const item of parsed.data.items) {
    if (item.received_qty <= 0) continue;

    const ingredientId = ingredientMap.get(item.po_item_id);
    if (!ingredientId) continue;

    await supabase.from("stock_movements").insert({
      ingredient_id: ingredientId,
      branch_id: po.branch_id,
      type: "in",
      quantity: item.received_qty,
      notes: `Nhận hàng từ đơn mua #${parsed.data.po_id}`,
      created_by: userId,
    });

    const { data: existing } = await supabase
      .from("stock_levels")
      .select("id, quantity, version")
      .eq("ingredient_id", ingredientId)
      .eq("branch_id", po.branch_id)
      .single();

    if (existing) {
      const newQty = existing.quantity + item.received_qty;
      await supabase
        .from("stock_levels")
        .update({ quantity: newQty, version: existing.version + 1 })
        .eq("id", existing.id)
        .eq("version", existing.version);
    } else {
      await supabase.from("stock_levels").insert({
        ingredient_id: ingredientId,
        branch_id: po.branch_id,
        quantity: item.received_qty,
      });
    }
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const receivePurchaseOrder = withServerAction(_receivePurchaseOrder);

async function _cancelPurchaseOrder(id: number) {
  const { supabase, tenantId } = await getActionContext();

  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!po) return { error: "Đơn mua hàng không tồn tại" };

  const validNextStatuses = VALID_PO_TRANSITIONS[po.status as PoStatus];
  if (!validNextStatuses || !validNextStatuses.includes("cancelled")) {
    return { error: `Không thể huỷ đơn ở trạng thái "${po.status}"` };
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

export const cancelPurchaseOrder = withServerAction(_cancelPurchaseOrder);
