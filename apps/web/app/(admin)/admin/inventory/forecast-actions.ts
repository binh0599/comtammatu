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
// getDemandForecast
// =====================

async function _getDemandForecast(
  days_ahead?: number,
  branch_id?: number,
  ingredient_id?: number,
): Promise<ForecastRow[]> {
  const parsed = forecastQuerySchema.parse({ days_ahead, branch_id, ingredient_id });
  const daysAhead = parsed.days_ahead;

  const { supabase, tenantId } = await getAdminContext(INVENTORY_ROLES);

  // Determine target branches
  let targetBranchIds: number[];
  if (parsed.branch_id) {
    // Verify branch belongs to tenant
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

  // Get completed orders from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id")
    .in("branch_id", targetBranchIds)
    .eq("status", "completed")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (ordersErr) throw safeDbError(ordersErr, "db");

  const orderIds = (orders ?? []).map((o: { id: number }) => o.id);

  // Get order_items -> recipes -> recipe_ingredients to calculate usage
  const usageMap = new Map<number, number>(); // ingredient_id -> total usage over 30 days

  if (orderIds.length > 0) {
    // Get order items with their menu_item_id and quantity
    const { data: orderItems, error: oiErr } = await supabase
      .from("order_items")
      .select("menu_item_id, quantity")
      .in("order_id", orderIds);

    if (oiErr) throw safeDbError(oiErr, "db");

    if (orderItems && orderItems.length > 0) {
      // Get all recipes for these menu items
      const menuItemIds = [
        ...new Set(orderItems.map((oi: { menu_item_id: number }) => oi.menu_item_id)),
      ];

      const { data: recipes, error: recErr } = await supabase
        .from("recipes")
        .select("id, menu_item_id, recipe_ingredients(ingredient_id, quantity, waste_pct)")
        .in("menu_item_id", menuItemIds);

      if (recErr) throw safeDbError(recErr, "db");

      // Build menu_item_id -> recipe_ingredients map
      const recipeMap = new Map<
        number,
        { ingredient_id: number; quantity: number; waste_pct: number }[]
      >();

      for (const recipe of recipes ?? []) {
        const recipeIngredients = recipe.recipe_ingredients as {
          ingredient_id: number;
          quantity: number;
          waste_pct: number;
        }[];
        recipeMap.set(recipe.menu_item_id, recipeIngredients ?? []);
      }

      // Calculate total ingredient usage
      for (const oi of orderItems) {
        const recipeIngs = recipeMap.get(oi.menu_item_id);
        if (!recipeIngs) continue;
        for (const ri of recipeIngs) {
          const wasteFactor = 1 + (Number(ri.waste_pct) || 0) / 100;
          const usage = Number(ri.quantity) * oi.quantity * wasteFactor;
          usageMap.set(
            ri.ingredient_id,
            (usageMap.get(ri.ingredient_id) ?? 0) + usage,
          );
        }
      }
    }
  }

  // Get current stock levels
  const ingredientIds = ingredients.map((i: { id: number }) => i.id);

  const { data: stockLevels, error: slErr } = await supabase
    .from("stock_levels")
    .select("ingredient_id, quantity")
    .in("ingredient_id", ingredientIds)
    .in("branch_id", targetBranchIds);

  if (slErr) throw safeDbError(slErr, "db");

  // Aggregate stock per ingredient (across branches if multi-branch)
  const stockMap = new Map<number, number>();
  for (const sl of stockLevels ?? []) {
    stockMap.set(
      sl.ingredient_id,
      (stockMap.get(sl.ingredient_id) ?? 0) + Number(sl.quantity),
    );
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
      dailyAvg > 0 && (daysUntilStockout !== null && daysUntilStockout < daysAhead);

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
    // Items with usage first, sorted by days_until_stockout
    if (a.days_until_stockout === null && b.days_until_stockout === null) return 0;
    if (a.days_until_stockout === null) return 1;
    if (b.days_until_stockout === null) return -1;
    return a.days_until_stockout - b.days_until_stockout;
  });

  return rows;
}

export const getDemandForecast = withServerQuery(_getDemandForecast);
