"use server";

import "@/lib/server-bootstrap";
import {
  ActionError,
  getActionContext,
  withServerAction,
  withServerQuery,
  safeDbError,
  safeDbErrorResult,
  menuItemSchema,
  menuItemAvailableSidesSchema,
  entityIdSchema,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

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

  // Verify menu item belongs to this tenant
  const { data: menuItem, error: ownershipError } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (ownershipError || !menuItem) {
    return { error: "Món ăn không tồn tại hoặc không thuộc đơn vị của bạn" };
  }

  // Delete menu item directly. If order_items reference it, FK constraint
  // blocks with 23503. Pre-checking order_items is unreliable because
  // order_items RLS is branch-scoped while admin context has no branch.
  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Không thể xoá món này vì đã có đơn hàng sử dụng. Hãy tắt hiển thị (đánh dấu không khả dụng) thay vì xoá.",
      };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const deleteMenuItem = withServerAction(_deleteMenuItem);

// --- Available Sides Management ---

async function _getAvailableSides(menuItemId: number) {
  entityIdSchema.parse(menuItemId);
  const { supabase, tenantId } = await getActionContext();

  // Verify menu item belongs to this tenant
  const { data: item, error: ownershipError } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", menuItemId)
    .eq("tenant_id", tenantId)
    .single();

  if (ownershipError) {
    // PGRST116 = no rows found; anything else is a real DB/RLS error
    if (ownershipError.code !== "PGRST116") {
      throw safeDbError(ownershipError, "db");
    }
    throw new ActionError("Món ăn không tồn tại hoặc không thuộc đơn vị của bạn", "NOT_FOUND", 404);
  }

  if (!item) {
    throw new ActionError("Món ăn không tồn tại hoặc không thuộc đơn vị của bạn", "NOT_FOUND", 404);
  }

  const { data, error } = await supabase
    .from("menu_item_available_sides")
    .select(
      "side_item_id, menu_items!menu_item_available_sides_side_item_id_fkey(id, name, base_price)"
    )
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

async function _updateAvailableSides(data: { menu_item_id: number; side_item_ids: number[] }) {
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

    const inserts = parsed.data.side_item_ids.map((sideId: number) => ({
      menu_item_id: parsed.data.menu_item_id,
      side_item_id: sideId,
    }));

    const { error: insertError } = await supabase.from("menu_item_available_sides").insert(inserts);

    if (insertError) return safeDbErrorResult(insertError, "db");
  }

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const updateAvailableSides = withServerAction(_updateAvailableSides);
