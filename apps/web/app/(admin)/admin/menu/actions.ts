"use server";

import "@/lib/server-bootstrap";
import {
  ActionError,
  getActionContext,
  withServerAction,
  withServerQuery,
  safeDbError,
  safeDbErrorResult,
  menuSchema,
  menuCategorySchema,
  menuItemSchema,
  menuItemAvailableSidesSchema,
  entityIdSchema,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

// --- Menu CRUD ---

async function _getMenus() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data;
}

export const getMenus = withServerQuery(_getMenus);

async function _createMenu(formData: FormData) {
  const parsed = menuSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase.from("menus").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    type: parsed.data.type,
    is_active: parsed.data.is_active,
  });

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const createMenu = withServerAction(_createMenu);

async function _updateMenu(id: number, formData: FormData) {
  entityIdSchema.parse(id);
  const parsed = menuSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("menus")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      is_active: parsed.data.is_active,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const updateMenu = withServerAction(_updateMenu);

async function _deleteMenu(id: number) {
  entityIdSchema.parse(id);
  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("menus")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const deleteMenu = withServerAction(_deleteMenu);

// --- Category CRUD ---

async function _getCategories(menuId: number) {
  entityIdSchema.parse(menuId);
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("menu_categories")
    .select("*, menus!inner(tenant_id)")
    .eq("menu_id", menuId)
    .eq("menus.tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (error) throw safeDbError(error, "db");
  return data;
}

export const getCategories = withServerQuery(_getCategories);

async function _createCategory(formData: FormData) {
  const parsed = menuCategorySchema.safeParse({
    menu_id: formData.get("menu_id"),
    name: formData.get("name"),
    sort_order: formData.get("sort_order"),
    type: formData.get("type") || "main_dish",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  // Verify menu belongs to this tenant
  const { data: menu } = await supabase
    .from("menus")
    .select("id")
    .eq("id", parsed.data.menu_id)
    .eq("tenant_id", tenantId)
    .single();

  if (!menu) {
    return { error: "Menu không tồn tại hoặc không thuộc đơn vị của bạn" };
  }

  const { error } = await supabase.from("menu_categories").insert({
    menu_id: parsed.data.menu_id,
    name: parsed.data.name,
    sort_order: parsed.data.sort_order,
    type: parsed.data.type,
  });

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const createCategory = withServerAction(_createCategory);

async function _deleteCategory(id: number) {
  entityIdSchema.parse(id);
  const { supabase, tenantId } = await getActionContext();

  // Verify category belongs to this tenant via menu
  const { data: category } = await supabase
    .from("menu_categories")
    .select("id, menus!inner(tenant_id)")
    .eq("id", id)
    .eq("menus.tenant_id", tenantId)
    .single();

  if (!category) {
    return { error: "Danh mục không tồn tại hoặc không thuộc đơn vị của bạn" };
  }

  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const deleteCategory = withServerAction(_deleteCategory);

// --- Menu Item CRUD ---

async function _getMenuItems(categoryId: number) {
  entityIdSchema.parse(categoryId);
  const { supabase } = await getActionContext();

  const { data, error } = await supabase
    .from("menu_items")
    .select("*, menu_item_variants(*), menu_item_modifiers(*)")
    .eq("category_id", categoryId)
    .order("name", { ascending: true });

  if (error) throw safeDbError(error, "db");
  return data;
}

export const getMenuItems = withServerQuery(_getMenuItems);

async function _createMenuItem(formData: FormData) {
  const parsed = menuItemSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description"),
    base_price: formData.get("base_price"),
    is_available: formData.get("is_available") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase.from("menu_items").insert({
    tenant_id: tenantId,
    category_id: parsed.data.category_id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    base_price: parsed.data.base_price,
    is_available: parsed.data.is_available,
  });

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const createMenuItem = withServerAction(_createMenuItem);

async function _updateMenuItem(id: number, formData: FormData) {
  entityIdSchema.parse(id);
  const parsed = menuItemSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description"),
    base_price: formData.get("base_price"),
    is_available: formData.get("is_available") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("menu_items")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      base_price: parsed.data.base_price,
      is_available: parsed.data.is_available,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const updateMenuItem = withServerAction(_updateMenuItem);

async function _deleteMenuItem(id: number) {
  entityIdSchema.parse(id);
  const { supabase, tenantId } = await getActionContext();

  // Check if menu item has been used in any orders
  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("menu_item_id", id);

  if (count && count > 0) {
    return {
      error:
        "Không thể xoá món này vì đã có đơn hàng sử dụng. Hãy tắt hiển thị (đánh dấu không khả dụng) thay vì xoá.",
    };
  }

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const deleteMenuItem = withServerAction(_deleteMenuItem);

// --- Available Sides Management ---

async function _getAvailableSides(menuItemId: number) {
  entityIdSchema.parse(menuItemId);
  const { supabase, tenantId } = await getActionContext();

  // Verify menu item belongs to this tenant
  const { data: item } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", menuItemId)
    .eq("tenant_id", tenantId)
    .single();

  if (!item) {
    throw new ActionError(
      "Món ăn không tồn tại hoặc không thuộc đơn vị của bạn",
      "NOT_FOUND",
      404
    );
  }

  const { data, error } = await supabase
    .from("menu_item_available_sides")
    .select("side_item_id, menu_items!menu_item_available_sides_side_item_id_fkey(id, name, base_price)")
    .eq("menu_item_id", menuItemId);

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getAvailableSides = withServerQuery(_getAvailableSides);

async function _getSideItems(menuId: number) {
  entityIdSchema.parse(menuId);
  const { supabase, tenantId } = await getActionContext();

  // Get all items from side_dish categories in this menu
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, base_price, category_id, menu_categories!inner(type, menu_id)")
    .eq("tenant_id", tenantId)
    .eq("menu_categories.type", "side_dish")
    .eq("menu_categories.menu_id", menuId)
    .eq("is_available", true)
    .order("name");

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getSideItems = withServerQuery(_getSideItems);

async function _updateAvailableSides(data: {
  menu_item_id: number;
  side_item_ids: number[];
}) {
  const parsed = menuItemAvailableSidesSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const { supabase, tenantId } = await getActionContext();

  // Verify menu item belongs to this tenant
  const { data: item } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", parsed.data.menu_item_id)
    .eq("tenant_id", tenantId)
    .single();

  if (!item) {
    return { error: "Món ăn không tồn tại hoặc không thuộc đơn vị của bạn" };
  }

  // Delete existing sides
  const { error: deleteError } = await supabase
    .from("menu_item_available_sides")
    .delete()
    .eq("menu_item_id", parsed.data.menu_item_id);

  if (deleteError) return safeDbErrorResult(deleteError, "db");

  // Insert new sides
  if (parsed.data.side_item_ids.length > 0) {
    // Verify all side_item_ids belong to this tenant
    const { data: validSides, error: validationError } = await supabase
      .from("menu_items")
      .select("id")
      .in("id", parsed.data.side_item_ids)
      .eq("tenant_id", tenantId);

    if (validationError) return safeDbErrorResult(validationError, "db");

    if (!validSides || validSides.length !== parsed.data.side_item_ids.length) {
      return {
        error: "Một số món kèm không hợp lệ hoặc không thuộc đơn vị của bạn",
      };
    }

    const inserts = parsed.data.side_item_ids.map((sideId) => ({
      menu_item_id: parsed.data.menu_item_id,
      side_item_id: sideId,
    }));

    const { error: insertError } = await supabase
      .from("menu_item_available_sides")
      .insert(inserts);

    if (insertError) return safeDbErrorResult(insertError, "db");
  }

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const updateAvailableSides = withServerAction(_updateAvailableSides);
