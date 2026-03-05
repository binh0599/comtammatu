"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createStockCountSchema,
  foodCostQuerySchema,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

// ===== Prep List =====

async function _getPrepList(targetPortions?: number) {
  const { supabase, branchId } = await getActionContext();

  if (!branchId) return [];

  const { data, error } = await supabase.rpc("calculate_prep_list", {
    p_branch_id: branchId,
    p_target_portions: targetPortions ?? 0,
  });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getPrepList = withServerQuery(_getPrepList);

// ===== Food Cost Report =====

async function _getFoodCostReport(input: {
  date_from: string;
  date_to: string;
}) {
  const parsed = foodCostQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, branchId } = await getActionContext();
  if (!branchId) return { error: "Chưa chọn chi nhánh" };

  const { data, error } = await supabase.rpc("calculate_food_cost", {
    p_branch_id: branchId,
    p_date_from: parsed.data.date_from,
    p_date_to: parsed.data.date_to,
  });

  if (error) return { error: error.message };

  const result = Array.isArray(data) ? data[0] : data;
  return {
    error: null,
    data: result as {
      total_revenue: number;
      total_ingredient_cost: number;
      food_cost_pct: number;
      item_count: number;
      top_cost_items: { ingredient_name: string; total_qty: number; total_cost: number }[];
    },
  };
}

export const getFoodCostReport = withServerAction(_getFoodCostReport);

// ===== Stock Count (End-of-Day) =====

async function _getStockCounts() {
  const { supabase, branchId } = await getActionContext();

  if (!branchId) return [];

  const { data, error } = await supabase
    .from("stock_counts")
    .select("*, profiles!fk_stock_counts_user(full_name)")
    .eq("branch_id", branchId)
    .order("counted_at", { ascending: false })
    .limit(20);

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getStockCounts = withServerQuery(_getStockCounts);

async function _createStockCount(input: {
  items: { ingredient_id: number; actual_qty: number; notes?: string }[];
  notes?: string;
}) {
  const parsed = createStockCountSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, branchId, userId } = await getActionContext();
  if (!branchId) return { error: "Chưa chọn chi nhánh" };

  // Create the stock count header
  const { data: count, error: countError } = await supabase
    .from("stock_counts")
    .insert({
      branch_id: branchId,
      counted_by: userId,
      notes: parsed.data.notes || null,
      status: "submitted",
    })
    .select("id")
    .single();

  if (countError) return safeDbErrorResult(countError, "db");

  // Fetch current system quantities for each ingredient
  const ingredientIds = parsed.data.items.map((i) => i.ingredient_id);
  const { data: stockLevels } = await supabase
    .from("stock_levels")
    .select("ingredient_id, quantity")
    .in("ingredient_id", ingredientIds)
    .eq("branch_id", branchId);

  const systemQtyMap = new Map(
    (stockLevels ?? []).map((sl: { ingredient_id: number; quantity: number }) => [
      sl.ingredient_id,
      sl.quantity,
    ])
  );

  // Insert count items
  const countItems = parsed.data.items.map((item) => ({
    stock_count_id: count.id,
    ingredient_id: item.ingredient_id,
    system_qty: systemQtyMap.get(item.ingredient_id) ?? 0,
    actual_qty: item.actual_qty,
    notes: item.notes || null,
  }));

  const { error: itemsError } = await supabase
    .from("stock_count_items")
    .insert(countItems);

  if (itemsError) return safeDbErrorResult(itemsError, "db");

  revalidatePath("/admin/inventory");
  return { error: null, success: true, count_id: count.id };
}

export const createStockCount = withServerAction(_createStockCount);

async function _approveStockCount(countId: number) {
  const { supabase, branchId, userId } = await getActionContext();
  if (!branchId) return { error: "Chưa chọn chi nhánh" };

  // Fetch count + items
  const { data: count, error: countError } = await supabase
    .from("stock_counts")
    .select("id, status, branch_id")
    .eq("id", countId)
    .eq("branch_id", branchId)
    .single();

  if (countError || !count) return { error: "Phiếu kiểm kho không tồn tại" };
  if (count.status !== "submitted") {
    return { error: "Chỉ có thể duyệt phiếu ở trạng thái 'Đã nộp'" };
  }

  const { data: items, error: itemsError } = await supabase
    .from("stock_count_items")
    .select("ingredient_id, system_qty, actual_qty")
    .eq("stock_count_id", countId);

  if (itemsError) return safeDbErrorResult(itemsError, "db");

  // Approve the count
  const { error: updateError } = await supabase
    .from("stock_counts")
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", countId);

  if (updateError) return safeDbErrorResult(updateError, "db");

  // Apply adjustments for items with variance
  for (const item of items ?? []) {
    const typed = item as { ingredient_id: number; system_qty: number; actual_qty: number };
    const variance = typed.actual_qty - typed.system_qty;
    if (Math.abs(variance) < 0.001) continue;

    // Create adjustment stock movement
    await supabase.from("stock_movements").insert({
      ingredient_id: typed.ingredient_id,
      branch_id: branchId,
      type: "adjust",
      quantity: Math.abs(variance),
      notes: `Kiểm kho #${countId}: ${variance > 0 ? "thừa" : "thiếu"} ${Math.abs(variance).toFixed(2)}`,
      created_by: userId,
    });

    // Update stock_levels to match actual
    const { data: existing } = await supabase
      .from("stock_levels")
      .select("id, version")
      .eq("ingredient_id", typed.ingredient_id)
      .eq("branch_id", branchId)
      .single();

    if (existing) {
      await supabase
        .from("stock_levels")
        .update({
          quantity: typed.actual_qty,
          version: existing.version + 1,
        })
        .eq("id", existing.id)
        .eq("version", existing.version);
    }
  }

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const approveStockCount = withServerAction(_approveStockCount);

// ===== Expiry Tracking =====

async function _getExpiringBatches(daysAhead: number = 7) {
  const { supabase, branchId } = await getActionContext();
  if (!branchId) return [];

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from("stock_batches")
    .select("*, ingredients(name, unit)")
    .eq("branch_id", branchId)
    .gt("quantity", 0)
    .not("expiry_date", "is", null)
    .lte("expiry_date", futureDate.toISOString().split("T")[0])
    .order("expiry_date", { ascending: true });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getExpiringBatches = withServerQuery(_getExpiringBatches);

// ===== Price Anomaly Detection =====

const PRICE_ANOMALY_THRESHOLD = 0.20; // 20% deviation

async function _getPriceAnomalies() {
  const { supabase, tenantId } = await getActionContext();

  // Get all recent PO items with their prices
  const { data: recentItems, error } = await supabase
    .from("purchase_order_items")
    .select(`
      id,
      ingredient_id,
      unit_price,
      quantity,
      po_id,
      ingredients(name, unit),
      purchase_orders!inner(tenant_id, status, created_at)
    `)
    .eq("purchase_orders.tenant_id", tenantId)
    .gt("unit_price", 0)
    .order("po_id", { ascending: false })
    .limit(500);

  if (error) throw safeDbError(error, "db");
  if (!recentItems || recentItems.length === 0) return [];

  // Group by ingredient to calculate avg price
  const pricesByIngredient = new Map<number, number[]>();
  for (const item of recentItems) {
    const prices = pricesByIngredient.get(item.ingredient_id) ?? [];
    prices.push(Number(item.unit_price));
    pricesByIngredient.set(item.ingredient_id, prices);
  }

  // Calculate averages (excluding current/latest entry for each ingredient)
  const avgPrices = new Map<number, number>();
  for (const [ingredientId, prices] of pricesByIngredient) {
    if (prices.length < 2) continue; // Need at least 2 data points
    const sum = prices.slice(1).reduce((a, b) => a + b, 0);
    avgPrices.set(ingredientId, sum / (prices.length - 1));
  }

  // Find anomalies in the most recent POs (draft/sent status)
  const anomalies: {
    po_id: number;
    ingredient_id: number;
    ingredient_name: string;
    unit: string;
    current_price: number;
    avg_price: number;
    deviation_pct: number;
    direction: "up" | "down";
  }[] = [];

  for (const item of recentItems) {
    const po = item.purchase_orders as unknown as { status: string; created_at: string };
    if (po.status !== "draft" && po.status !== "sent") continue;

    const avg = avgPrices.get(item.ingredient_id);
    if (avg === undefined || avg === 0) continue;

    const price = Number(item.unit_price);
    const deviation = (price - avg) / avg;

    if (Math.abs(deviation) >= PRICE_ANOMALY_THRESHOLD) {
      const ing = item.ingredients as unknown as { name: string; unit: string } | null;
      anomalies.push({
        po_id: item.po_id,
        ingredient_id: item.ingredient_id,
        ingredient_name: ing?.name ?? `#${item.ingredient_id}`,
        unit: ing?.unit ?? "",
        current_price: price,
        avg_price: Math.round(avg * 100) / 100,
        deviation_pct: Math.round(deviation * 100),
        direction: deviation > 0 ? "up" : "down",
      });
    }
  }

  return anomalies;
}

export const getPriceAnomalies = withServerQuery(_getPriceAnomalies);
