"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  safeDbError,
  safeDbErrorResult,
  menuSchema,
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

  // Verify menu belongs to this tenant
  const { data: menu } = await supabase
    .from("menus")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!menu) {
    return { error: "Thực đơn không tồn tại hoặc không thuộc đơn vị của bạn" };
  }

  // Delete menu — CASCADE will remove categories and items.
  // If order_items reference any menu_items, the FK constraint (no CASCADE)
  // will block deletion with a 23503 error. We catch that specifically
  // instead of pre-checking order_items (which fails due to branch-scoped RLS).
  const { error } = await supabase
    .from("menus")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Không thể xoá thực đơn này vì có món ăn đã được sử dụng trong đơn hàng. Hãy tắt thực đơn (tạm dừng) thay vì xoá.",
      };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/menu");
  return { error: null, success: true };
}

export const deleteMenu = withServerAction(_deleteMenu);
