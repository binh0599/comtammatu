"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createIngredientSchema,
  safeDbError,
  safeDbErrorResult,
  MSG,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";
import { inventoryLimiter } from "@comtammatu/security";

async function _getIngredients() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw safeDbError(error, "db");
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

  if (error) throw safeDbError(error, "db");
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
    return { error: parsed.error.issues[0]?.message ?? MSG.INVALID_DATA };
  }

  const { supabase, tenantId, userId } = await getActionContext();
  const { success: rateLimitOk } = await inventoryLimiter.limit(userId);
  if (!rateLimitOk) return { error: "Quá nhiều yêu cầu, vui lòng thử lại sau" };

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
      return { error: MSG.SKU_EXISTS };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
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
    return { error: parsed.error.issues[0]?.message ?? MSG.INVALID_DATA };
  }

  const { supabase, tenantId, userId } = await getActionContext();
  const { success: rateLimitOk } = await inventoryLimiter.limit(userId);
  if (!rateLimitOk) return { error: "Quá nhiều yêu cầu, vui lòng thử lại sau" };

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

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const updateIngredient = withServerAction(_updateIngredient);

async function _deleteIngredient(id: number) {
  const { supabase, tenantId, userId } = await getActionContext();
  const { success: rateLimitOk } = await inventoryLimiter.limit(userId);
  if (!rateLimitOk) return { error: "Quá nhiều yêu cầu, vui lòng thử lại sau" };

  const { error } = await supabase
    .from("ingredients")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const deleteIngredient = withServerAction(_deleteIngredient);
