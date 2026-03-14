"use server";

import "@/lib/server-bootstrap";
import {
  getAdminContext,
  getBranchIdsForTenant,
  withServerQuery,
  safeDbError,
  INVENTORY_ROLES,
  forecastQuerySchema,
} from "@comtammatu/shared";

// =====================
// Types
// =====================

export interface ForecastRow {
  ingredient_id: number;
  name: string;
  unit: string;
  current_stock: number;
  daily_avg_usage: number;
  projected_need: number;
  days_until_stockout: number | null; // null = no usage
  reorder_suggested: boolean;
}

// =====================
// getDemandForecast — Now reads from materialized view
// =====================

async function _getDemandForecast(
  days_ahead?: number,
  branch_id?: number,
  ingredient_id?: number
): Promise<ForecastRow[]> {
  const parsed = forecastQuerySchema.parse({ days_ahead, branch_id, ingredient_id });
  const daysAhead = parsed.days_ahead;

  const { supabase, tenantId } = await getAdminContext(INVENTORY_ROLES);

  // Determine target branches
  let targetBranchIds: number[];
  if (parsed.branch_id) {
    const allBranchIds = await getBranchIdsForTenant(supabase, tenantId);
    if (!allBranchIds.includes(parsed.branch_id)) {
      return [];
    }
    targetBranchIds = [parsed.branch_id];
  } else {
    targetBranchIds = await getBranchIdsForTenant(supabase, tenantId);
  }

  if (targetBranchIds.length === 0) return [];

  // Get tenant ingredients
  let ingredientQuery = supabase
    .from("ingredients")
    .select("id, name, unit")
    .eq("tenant_id", tenantId);

  if (parsed.ingredient_id) {
    ingredientQuery = ingredientQuery.eq("id", parsed.ingredient_id);
  }

  const { data: ingredients, error: ingErr } = await ingredientQuery;
  if (ingErr) throw safeDbError(ingErr, "db");
  if (!ingredients || ingredients.length === 0) return [];

  const ingredientIds = ingredients.map((i: { id: number }) => i.id);

  // Calculate 30-day window for usage average
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

  // Fetch from MV + stock levels in parallel
  const [usageResult, stockResult] = await Promise.all([
    // Usage from MV (already pre-computed: orders → order_items → recipes → ingredients)
    supabase
      .from("mv_inventory_usage")
      .select("ingredient_id, total_usage")
      .in("branch_id", targetBranchIds)
      .in("ingredient_id", ingredientIds)
      .gte("report_date", thirtyDaysAgoStr),

    // Current stock levels (real-time, not materialized)
    supabase
      .from("stock_levels")
      .select("ingredient_id, quantity")
      .in("ingredient_id", ingredientIds)
      .in("branch_id", targetBranchIds),
  ]);

  if (usageResult.error) throw safeDbError(usageResult.error, "db");
  if (stockResult.error) throw safeDbError(stockResult.error, "db");

  // Aggregate usage per ingredient (across branches + days in 30-day window)
  const usageMap = new Map<number, number>();
  for (const row of usageResult.data ?? []) {
    if (row.ingredient_id == null) continue;
    usageMap.set(
      row.ingredient_id,
      (usageMap.get(row.ingredient_id) ?? 0) + Number(row.total_usage)
    );
  }

  // Aggregate stock per ingredient (across branches)
  const stockMap = new Map<number, number>();
  for (const sl of stockResult.data ?? []) {
    if (sl.ingredient_id == null) continue;
    stockMap.set(sl.ingredient_id, (stockMap.get(sl.ingredient_id) ?? 0) + Number(sl.quantity));
  }

  // Build forecast rows
  const rows: ForecastRow[] = [];

  for (const ing of ingredients) {
    const totalUsage30d = usageMap.get(ing.id) ?? 0;
    const dailyAvg = totalUsage30d / 30;
    const projectedNeed = dailyAvg * daysAhead;
    const currentStock = stockMap.get(ing.id) ?? 0;

    let daysUntilStockout: number | null = null;
    if (dailyAvg > 0) {
      daysUntilStockout = Math.floor(currentStock / dailyAvg);
    }

    const reorderSuggested =
      dailyAvg > 0 && daysUntilStockout !== null && daysUntilStockout < daysAhead;

    rows.push({
      ingredient_id: ing.id,
      name: ing.name,
      unit: ing.unit,
      current_stock: currentStock,
      daily_avg_usage: Math.round(dailyAvg * 100) / 100,
      projected_need: Math.round(projectedNeed * 100) / 100,
      days_until_stockout: daysUntilStockout,
      reorder_suggested: reorderSuggested,
    });
  }

  // Sort by urgency: items running out soonest first
  rows.sort((a, b) => {
    if (a.days_until_stockout === null && b.days_until_stockout === null) return 0;
    if (a.days_until_stockout === null) return 1;
    if (b.days_until_stockout === null) return -1;
    return a.days_until_stockout - b.days_until_stockout;
  });

  return rows;
}

export const getDemandForecast = withServerQuery(_getDemandForecast);
