"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  getBranchIdsForTenant,
  withServerAction,
  withServerQuery,
  createStockMovementSchema,
  branchTransferSchema,
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
  const { supabase, tenantId } = await getActionContext();

  // Verify ingredient belongs to this tenant
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("id")
    .eq("id", data.ingredient_id)
    .eq("tenant_id", tenantId)
    .single();
  if (!ingredient) return { error: "Nguyên liệu không thuộc đơn vị của bạn" };

  // Verify branch belongs to this tenant
  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (!branchIds.includes(data.branch_id)) {
    return { error: "Chi nhánh không thuộc đơn vị của bạn" };
  }

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

  const { supabase, userId, tenantId } = await getActionContext();

  // Verify ingredient belongs to this tenant
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("id")
    .eq("id", parsed.data.ingredient_id)
    .eq("tenant_id", tenantId)
    .single();
  if (!ingredient) return { error: "Nguyên liệu không thuộc đơn vị của bạn" };

  // Verify branch belongs to this tenant
  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (!branchIds.includes(parsed.data.branch_id)) {
    return { error: "Chi nhánh không thuộc đơn vị của bạn" };
  }

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

// ---------------------------------------------------------------------------
// createBranchTransfer — moves stock between two branches atomically
// ---------------------------------------------------------------------------

async function _createBranchTransfer(data: {
  from_branch_id: number;
  to_branch_id: number;
  items: { ingredient_id: number; quantity: number }[];
  notes?: string;
}) {
  const parsed = branchTransferSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, userId, tenantId } = await getActionContext();

  // Verify both branches belong to this tenant
  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (!branchIds.includes(parsed.data.from_branch_id)) {
    return { error: "Chi nhánh xuất không thuộc đơn vị của bạn" };
  }
  if (!branchIds.includes(parsed.data.to_branch_id)) {
    return { error: "Chi nhánh nhận không thuộc đơn vị của bạn" };
  }

  // Verify all ingredients belong to this tenant
  const ingredientIds = parsed.data.items.map((i) => i.ingredient_id);
  const { data: ingredients, error: ingErr } = await supabase
    .from("ingredients")
    .select("id")
    .in("id", ingredientIds)
    .eq("tenant_id", tenantId);

  if (ingErr) return safeDbErrorResult(ingErr, "db");
  if (!ingredients || ingredients.length !== ingredientIds.length) {
    return { error: "Một số nguyên liệu không thuộc đơn vị của bạn" };
  }

  // Process each item
  const notePrefix = parsed.data.notes
    ? `[Chuyển kho] ${parsed.data.notes}`
    : "[Chuyển kho]";

  for (const item of parsed.data.items) {
    // 1. Check source has enough stock
    const { data: srcLevel } = await supabase
      .from("stock_levels")
      .select("id, quantity, version")
      .eq("ingredient_id", item.ingredient_id)
      .eq("branch_id", parsed.data.from_branch_id)
      .single();

    if (!srcLevel || srcLevel.quantity < item.quantity) {
      const { data: ing } = await supabase
        .from("ingredients")
        .select("name")
        .eq("id", item.ingredient_id)
        .single();
      return {
        error: `Không đủ tồn kho ${ing?.name ?? item.ingredient_id}: hiện có ${srcLevel?.quantity ?? 0}, cần ${item.quantity}`,
      };
    }

    // 2. Create OUT movement on source branch
    const { error: outErr } = await supabase.from("stock_movements").insert({
      ingredient_id: item.ingredient_id,
      branch_id: parsed.data.from_branch_id,
      type: "transfer",
      quantity: item.quantity,
      notes: `${notePrefix} → chi nhánh ${parsed.data.to_branch_id}`,
      created_by: userId,
    });
    if (outErr) return { error: outErr.message };

    // 3. Deduct from source (optimistic lock)
    const newSrcQty = Math.max(0, srcLevel.quantity - item.quantity);
    const { error: srcUpdate } = await supabase
      .from("stock_levels")
      .update({ quantity: newSrcQty, version: srcLevel.version + 1 })
      .eq("id", srcLevel.id)
      .eq("version", srcLevel.version);

    if (srcUpdate) return { error: "Xung đột cập nhật tồn kho, vui lòng thử lại" };

    // 4. Create IN movement on destination branch
    const { error: inErr } = await supabase.from("stock_movements").insert({
      ingredient_id: item.ingredient_id,
      branch_id: parsed.data.to_branch_id,
      type: "transfer",
      quantity: item.quantity,
      notes: `${notePrefix} ← chi nhánh ${parsed.data.from_branch_id}`,
      created_by: userId,
    });
    if (inErr) return { error: inErr.message };

    // 5. Add to destination stock (upsert pattern)
    const { data: dstLevel } = await supabase
      .from("stock_levels")
      .select("id, quantity, version")
      .eq("ingredient_id", item.ingredient_id)
      .eq("branch_id", parsed.data.to_branch_id)
      .single();

    if (dstLevel) {
      const newDstQty = dstLevel.quantity + item.quantity;
      const { error: dstUpdate } = await supabase
        .from("stock_levels")
        .update({ quantity: newDstQty, version: dstLevel.version + 1 })
        .eq("id", dstLevel.id)
        .eq("version", dstLevel.version);

      if (dstUpdate) return { error: "Xung đột cập nhật tồn kho đích, vui lòng thử lại" };
    } else {
      const { error: dstInsert } = await supabase.from("stock_levels").insert({
        ingredient_id: item.ingredient_id,
        branch_id: parsed.data.to_branch_id,
        quantity: item.quantity,
      });
      if (dstInsert) return { error: dstInsert.message };
    }
  }

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const createBranchTransfer = withServerAction(_createBranchTransfer);
