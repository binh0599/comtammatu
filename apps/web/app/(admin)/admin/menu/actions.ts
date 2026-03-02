"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { ActionError, handleServerActionError } from "@comtammatu/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// --- Schemas ---

const menuSchema = z.object({
  name: z.string().min(1, "Ten thuc don khong duoc de trong"),
  type: z.enum(["dine_in", "takeaway", "delivery"]),
  is_active: z.boolean().default(true),
});

const categorySchema = z.object({
  menu_id: z.coerce.number().positive(),
  name: z.string().min(1, "Ten danh muc khong duoc de trong"),
  sort_order: z.coerce.number().int().min(0).default(0),
});

const menuItemSchema = z.object({
  category_id: z.coerce.number().positive(),
  name: z.string().min(1, "Ten mon khong duoc de trong"),
  description: z.string().optional(),
  base_price: z.coerce.number().positive("Gia phai lon hon 0"),
  is_available: z.boolean().default(true),
});

// --- Helper: Get tenant_id from authenticated user ---

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new ActionError("Ban phai dang nhap", "UNAUTHORIZED", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.tenant_id;
  if (!tenantId)
    throw new ActionError(
      "Tai khoan chua duoc gan tenant",
      "UNAUTHORIZED",
      403,
    );

  return { supabase, tenantId };
}

// --- Menu CRUD ---

async function _getMenus() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data;
}

export async function getMenus() {
  try {
    return await _getMenus();
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error);
  }
}

async function _createMenu(formData: FormData) {
  const parsed = menuSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, tenantId } = await getTenantId();

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

export async function createMenu(formData: FormData) {
  try {
    return await _createMenu(formData);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

async function _updateMenu(id: number, formData: FormData) {
  const parsed = menuSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, tenantId } = await getTenantId();

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

export async function updateMenu(id: number, formData: FormData) {
  try {
    return await _updateMenu(id, formData);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

async function _deleteMenu(id: number) {
  const { supabase, tenantId } = await getTenantId();

  const { error } = await supabase
    .from("menus")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export async function deleteMenu(id: number) {
  try {
    return await _deleteMenu(id);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

// --- Category CRUD ---

async function _getCategories(menuId: number) {
  const { supabase } = await getTenantId();

  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("menu_id", menuId)
    .order("sort_order", { ascending: true });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data;
}

export async function getCategories(menuId: number) {
  try {
    return await _getCategories(menuId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error);
  }
}

async function _createCategory(formData: FormData) {
  const parsed = categorySchema.safeParse({
    menu_id: formData.get("menu_id"),
    name: formData.get("name"),
    sort_order: formData.get("sort_order"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase } = await getTenantId();

  const { error } = await supabase.from("menu_categories").insert({
    menu_id: parsed.data.menu_id,
    name: parsed.data.name,
    sort_order: parsed.data.sort_order,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export async function createCategory(formData: FormData) {
  try {
    return await _createCategory(formData);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

async function _deleteCategory(id: number) {
  const { supabase } = await getTenantId();

  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export async function deleteCategory(id: number) {
  try {
    return await _deleteCategory(id);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

// --- Menu Item CRUD ---

async function _getMenuItems(categoryId: number) {
  const { supabase } = await getTenantId();

  const { data, error } = await supabase
    .from("menu_items")
    .select("*, menu_item_variants(*), menu_item_modifiers(*)")
    .eq("category_id", categoryId)
    .order("name", { ascending: true });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data;
}

export async function getMenuItems(categoryId: number) {
  try {
    return await _getMenuItems(categoryId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error);
  }
}

async function _createMenuItem(formData: FormData) {
  const parsed = menuItemSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description"),
    base_price: formData.get("base_price"),
    is_available: formData.get("is_available") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, tenantId } = await getTenantId();

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

export async function createMenuItem(formData: FormData) {
  try {
    return await _createMenuItem(formData);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

async function _updateMenuItem(id: number, formData: FormData) {
  const parsed = menuItemSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description"),
    base_price: formData.get("base_price"),
    is_available: formData.get("is_available") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, tenantId } = await getTenantId();

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

export async function updateMenuItem(id: number, formData: FormData) {
  try {
    return await _updateMenuItem(id, formData);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

async function _deleteMenuItem(id: number) {
  const { supabase, tenantId } = await getTenantId();

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export async function deleteMenuItem(id: number) {
  try {
    return await _deleteMenuItem(id);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}
