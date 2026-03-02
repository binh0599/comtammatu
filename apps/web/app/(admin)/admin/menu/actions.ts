"use server";

import "@/lib/server-bootstrap";
import {
  ActionError,
  getActionContext,
  withServerAction,
  withServerQuery,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// --- Schemas ---

const menuSchema = z.object({
  name: z.string().min(1, "Tên thực đơn không được để trống"),
  type: z.enum(["dine_in", "takeaway", "delivery"]),
  is_active: z.boolean().default(true),
});

const categorySchema = z.object({
  menu_id: z.coerce.number().positive(),
  name: z.string().min(1, "Tên danh mục không được để trống"),
  sort_order: z.coerce.number().int().min(0).default(0),
});

const menuItemSchema = z.object({
  category_id: z.coerce.number().positive(),
  name: z.string().min(1, "Tên món không được để trống"),
  description: z.string().optional(),
  base_price: z.coerce.number().positive("Giá phải lớn hơn 0"),
  is_available: z.boolean().default(true),
});

// --- Menu CRUD ---

async function _getMenus() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
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

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export const createMenu = withServerAction(_createMenu);

async function _updateMenu(id: number, formData: FormData) {
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

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export const updateMenu = withServerAction(_updateMenu);

async function _deleteMenu(id: number) {
  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("menus")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export const deleteMenu = withServerAction(_deleteMenu);

// --- Category CRUD ---

async function _getCategories(menuId: number) {
  const { supabase } = await getActionContext();

  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("menu_id", menuId)
    .order("sort_order", { ascending: true });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data;
}

export const getCategories = withServerQuery(_getCategories);

async function _createCategory(formData: FormData) {
  const parsed = categorySchema.safeParse({
    menu_id: formData.get("menu_id"),
    name: formData.get("name"),
    sort_order: formData.get("sort_order"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase } = await getActionContext();

  const { error } = await supabase.from("menu_categories").insert({
    menu_id: parsed.data.menu_id,
    name: parsed.data.name,
    sort_order: parsed.data.sort_order,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export const createCategory = withServerAction(_createCategory);

async function _deleteCategory(id: number) {
  const { supabase } = await getActionContext();

  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export const deleteCategory = withServerAction(_deleteCategory);

// --- Menu Item CRUD ---

async function _getMenuItems(categoryId: number) {
  const { supabase } = await getActionContext();

  const { data, error } = await supabase
    .from("menu_items")
    .select("*, menu_item_variants(*), menu_item_modifiers(*)")
    .eq("category_id", categoryId)
    .order("name", { ascending: true });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
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

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export const createMenuItem = withServerAction(_createMenuItem);

async function _updateMenuItem(id: number, formData: FormData) {
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

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export const updateMenuItem = withServerAction(_updateMenuItem);

async function _deleteMenuItem(id: number) {
  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export const deleteMenuItem = withServerAction(_deleteMenuItem);
