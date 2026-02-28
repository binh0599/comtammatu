"use server";

import { createSupabaseServer } from "@comtammatu/database";
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

// --- Helper: Get tenant_id from authenticated user ---

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

  return { supabase, tenantId };
}

// --- Menu CRUD ---

export async function getMenus() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createMenu(formData: FormData) {
  const parsed = menuSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" };
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

export async function updateMenu(id: number, formData: FormData) {
  const parsed = menuSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase } = await getTenantId();

  const { error } = await supabase
    .from("menus")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      is_active: parsed.data.is_active,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export async function deleteMenu(id: number) {
  const { supabase } = await getTenantId();

  const { error } = await supabase.from("menus").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

// --- Category CRUD ---

export async function getCategories(menuId: number) {
  const { supabase } = await getTenantId();

  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("menu_id", menuId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createCategory(formData: FormData) {
  const parsed = categorySchema.safeParse({
    menu_id: formData.get("menu_id"),
    name: formData.get("name"),
    sort_order: formData.get("sort_order"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" };
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

export async function deleteCategory(id: number) {
  const { supabase } = await getTenantId();

  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

// --- Menu Item CRUD ---

export async function getMenuItems(categoryId: number) {
  const { supabase } = await getTenantId();

  const { data, error } = await supabase
    .from("menu_items")
    .select("*, menu_item_variants(*), menu_item_modifiers(*)")
    .eq("category_id", categoryId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createMenuItem(formData: FormData) {
  const parsed = menuItemSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description"),
    base_price: formData.get("base_price"),
    is_available: formData.get("is_available") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" };
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

export async function updateMenuItem(id: number, formData: FormData) {
  const parsed = menuItemSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description"),
    base_price: formData.get("base_price"),
    is_available: formData.get("is_available") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase } = await getTenantId();

  const { error } = await supabase
    .from("menu_items")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      base_price: parsed.data.base_price,
      is_available: parsed.data.is_available,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}

export async function deleteMenuItem(id: number) {
  const { supabase } = await getTenantId();

  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/menu");
  return { success: true };
}
