"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createStockMovementSchema,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

async function _getStockLevels() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("stock_levels")
    .select("*, ingredients!inner(name, unit, min_stock, max_stock, tenant_id), branches!inner(name)")
    .eq("ingredients.tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
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
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const initStockLevel = withServerAction(_initStockLevel);

async function _getStockMovements() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("stock_movements")
    .select("*, ingredients!inner(name, unit, tenant_id), branches!inner(name), profiles(full_name)")
    .eq("ingredients.tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw safeDbError(error, "db");
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
  return { error: null, success: true };
}

export const createStockMovement = withServerAction(_createStockMovement);
