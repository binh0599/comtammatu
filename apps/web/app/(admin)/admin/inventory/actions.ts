"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import {
  createIngredientSchema,
  createStockMovementSchema,
  createRecipeSchema,
  createSupplierSchema,
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
  VALID_PO_TRANSITIONS,
  type PoStatus,
} from "@comtammatu/shared";

// --- Helper: Get tenant_id + userId from authenticated user ---

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.tenant_id;
  if (!tenantId) throw new Error("No tenant assigned");

  return { supabase, tenantId, userId: user.id };
}

// =====================
// Ingredients
// =====================

export async function getIngredients() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBranches() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createIngredient(formData: FormData) {
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
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, tenantId } = await getTenantId();

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
      return { error: "SKU da ton tai" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function updateIngredient(id: number, formData: FormData) {
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
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase } = await getTenantId();

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
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function deleteIngredient(id: number) {
  const { supabase } = await getTenantId();

  const { error } = await supabase.from("ingredients").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

// =====================
// Stock Levels
// =====================

export async function getStockLevels() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("stock_levels")
    .select("*, ingredients!inner(name, unit, min_stock, max_stock, tenant_id), branches!inner(name)")
    .eq("ingredients.tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function initStockLevel(data: {
  ingredient_id: number;
  branch_id: number;
  quantity: number;
}) {
  const { supabase } = await getTenantId();

  const { error } = await supabase.from("stock_levels").insert({
    ingredient_id: data.ingredient_id,
    branch_id: data.branch_id,
    quantity: data.quantity,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ton kho cho nguyen lieu nay tai chi nhanh da ton tai" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

// =====================
// Stock Movements
// =====================

export async function getStockMovements() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("stock_movements")
    .select(
      "*, ingredients!inner(name, unit, tenant_id), branches!inner(name), profiles(full_name)"
    )
    .eq("ingredients.tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createStockMovement(data: {
  ingredient_id: number;
  branch_id: number;
  type: string;
  quantity: number;
  notes?: string;
}) {
  const parsed = createStockMovementSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, userId } = await getTenantId();

  // Insert stock movement
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

  // Update stock_levels accordingly
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

// =====================
// Recipes
// =====================

export async function getRecipes() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("recipes")
    .select(
      "*, menu_items!inner(name, tenant_id), recipe_ingredients(*, ingredients(name, unit))"
    )
    .eq("menu_items.tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMenuItemsForRecipe() {
  const { supabase, tenantId } = await getTenantId();

  // Get all menu items for tenant
  const { data: allItems, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_available", true)
    .order("name");

  if (itemsError) throw new Error(itemsError.message);

  // Get all recipe menu_item_ids
  const { data: existingRecipes, error: recipesError } = await supabase
    .from("recipes")
    .select("menu_item_id, menu_items!inner(tenant_id)")
    .eq("menu_items.tenant_id", tenantId);

  if (recipesError) throw new Error(recipesError.message);

  const usedIds = new Set(existingRecipes?.map((r) => r.menu_item_id) ?? []);
  return (allItems ?? []).filter((item) => !usedIds.has(item.id));
}

export async function createRecipe(data: {
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
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase } = await getTenantId();

  // Insert the recipe
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
      return { error: "Mon nay da co cong thuc" };
    }
    return { error: recipeError.message };
  }

  // Insert recipe ingredients
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
    // Rollback recipe on ingredient insert failure
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

export async function deleteRecipe(id: number) {
  const { supabase } = await getTenantId();

  // Delete recipe ingredients first (cascade should handle this, but be explicit)
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);

  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

// =====================
// Suppliers
// =====================

export async function getSuppliers() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSupplier(formData: FormData) {
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
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, tenantId } = await getTenantId();

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
      return { error: "Nha cung cap da ton tai" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function updateSupplier(id: number, formData: FormData) {
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
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase } = await getTenantId();

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
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function deleteSupplier(id: number) {
  const { supabase } = await getTenantId();

  const { error } = await supabase.from("suppliers").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return { error: "Khong the xoa — nha cung cap nay dang co don mua hang" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

// =====================
// Purchase Orders
// =====================

export async function getPurchaseOrders() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      "*, suppliers(name), branches(name), purchase_order_items(*, ingredients(name, unit))"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPurchaseOrder(input: {
  supplier_id: number;
  branch_id: number;
  expected_at?: string;
  notes?: string;
  items: { ingredient_id: number; quantity: number; unit_price: number }[];
}) {
  const parsed = createPurchaseOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, tenantId, userId } = await getTenantId();

  // Calculate total
  const total = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  // Insert purchase order
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

  // Insert purchase order items
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
    // Rollback PO on items insert failure
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    return { error: itemsError.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function sendPurchaseOrder(id: number) {
  const { supabase } = await getTenantId();

  // Verify current status allows transition to 'sent'
  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!po) return { error: "Don mua hang khong ton tai" };

  const validNextStatuses = VALID_PO_TRANSITIONS[po.status as PoStatus];
  if (!validNextStatuses || !validNextStatuses.includes("sent")) {
    return { error: `Khong the gui don o trang thai "${po.status}"` };
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({
      status: "sent",
      ordered_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function receivePurchaseOrder(input: {
  po_id: number;
  items: { po_item_id: number; received_qty: number }[];
}) {
  const parsed = receivePurchaseOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, userId } = await getTenantId();

  // Verify current status allows transition to 'received'
  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status, branch_id")
    .eq("id", parsed.data.po_id)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!po) return { error: "Don mua hang khong ton tai" };

  const validNextStatuses = VALID_PO_TRANSITIONS[po.status as PoStatus];
  if (!validNextStatuses || !validNextStatuses.includes("received")) {
    return { error: `Khong the nhan hang o trang thai "${po.status}"` };
  }

  // Update each PO item's received_qty
  for (const item of parsed.data.items) {
    const { error: itemError } = await supabase
      .from("purchase_order_items")
      .update({ received_qty: item.received_qty })
      .eq("id", item.po_item_id);

    if (itemError) return { error: itemError.message };
  }

  // Update PO status to received
  const { error: poError } = await supabase
    .from("purchase_orders")
    .update({
      status: "received",
      received_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.po_id);

  if (poError) return { error: poError.message };

  // Get ingredient_id for each PO item to create stock movements
  const poItemIds = parsed.data.items.map((i) => i.po_item_id);
  const { data: poItems, error: poItemsError } = await supabase
    .from("purchase_order_items")
    .select("id, ingredient_id")
    .in("id", poItemIds);

  if (poItemsError) return { error: poItemsError.message };

  const ingredientMap = new Map(
    (poItems ?? []).map((pi) => [pi.id, pi.ingredient_id])
  );

  // Create stock movements and update stock levels for each received item
  for (const item of parsed.data.items) {
    if (item.received_qty <= 0) continue;

    const ingredientId = ingredientMap.get(item.po_item_id);
    if (!ingredientId) continue;

    // Insert stock movement (type = 'in')
    await supabase.from("stock_movements").insert({
      ingredient_id: ingredientId,
      branch_id: po.branch_id,
      type: "in",
      quantity: item.received_qty,
      notes: `Nhan hang tu don mua #${parsed.data.po_id}`,
      created_by: userId,
    });

    // Update stock levels with optimistic concurrency
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

export async function cancelPurchaseOrder(id: number) {
  const { supabase } = await getTenantId();

  // Verify current status allows transition to 'cancelled'
  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!po) return { error: "Don mua hang khong ton tai" };

  const validNextStatuses = VALID_PO_TRANSITIONS[po.status as PoStatus];
  if (!validNextStatuses || !validNextStatuses.includes("cancelled")) {
    return { error: `Khong the huy don o trang thai "${po.status}"` };
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}
