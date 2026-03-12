"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  safeDbError,
  safeDbErrorResult,
  menuCategorySchema,
  entityIdSchema,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

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

  // Delete category — CASCADE will remove menu_items.
  // If order_items reference any items, FK constraint blocks with 23503.
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Không thể xoá danh mục này vì có món ăn đã được sử dụng trong đơn hàng. Hãy xoá từng món hoặc tắt hiển thị thay vì xoá.",
      };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const deleteCategory = withServerAction(_deleteCategory);
