"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createRecipeSchema,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

async function _getRecipes() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("recipes")
    .select("*, menu_items!inner(name, tenant_id), recipe_ingredients(*, ingredients(name, unit))")
    .eq("menu_items.tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getRecipes = withServerQuery(_getRecipes);

async function _getMenuItemsForRecipe() {
  const { supabase, tenantId } = await getActionContext();

  const { data: allItems, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_available", true)
    .order("name");

  if (itemsError) throw safeDbError(itemsError, "db");

  const { data: existingRecipes, error: recipesError } = await supabase
    .from("recipes")
    .select("menu_item_id, menu_items!inner(tenant_id)")
    .eq("menu_items.tenant_id", tenantId);

  if (recipesError) throw safeDbError(recipesError, "db");

  const usedIds = new Set(
    existingRecipes?.map((r: { menu_item_id: number }) => r.menu_item_id) ?? []
  );
  return (allItems ?? []).filter((item: { id: number }) => !usedIds.has(item.id));
}

export const getMenuItemsForRecipe = withServerQuery(_getMenuItemsForRecipe);

async function _createRecipe(data: {
  menu_item_id: number;
  yield_qty?: number;
  yield_unit?: string;
  ingredients: {
    ingredient_id: number;
    quantity: number;
    unit: string;
    waste_pct?: number;
  }[];
}) {
  const parsed = createRecipeSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  // Verify menu_item_id belongs to this tenant
  const { data: menuItem } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", parsed.data.menu_item_id)
    .eq("tenant_id", tenantId)
    .single();
  if (!menuItem) return { error: "Món ăn không tồn tại hoặc không thuộc đơn vị của bạn" };

  // Verify all ingredient_ids belong to this tenant
  const inputIngredientIds = parsed.data.ingredients.map((i) => i.ingredient_id);
  const { data: validIngredients } = await supabase
    .from("ingredients")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("id", inputIngredientIds);
  if (!validIngredients || validIngredients.length !== inputIngredientIds.length) {
    return { error: "Nguyên liệu không hợp lệ hoặc không thuộc đơn vị của bạn" };
  }

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      menu_item_id: parsed.data.menu_item_id,
      yield_qty: parsed.data.yield_qty ?? null,
      yield_unit: parsed.data.yield_unit || null,
    })
    .select("id")
    .single();

  if (recipeError) {
    if (recipeError.code === "23505") {
      return { error: "Món này đã có công thức" };
    }
    return { error: recipeError.message };
  }

  const ingredientRows = parsed.data.ingredients.map((ing) => ({
    recipe_id: recipe.id,
    ingredient_id: ing.ingredient_id,
    quantity: ing.quantity,
    unit: ing.unit,
    waste_pct: ing.waste_pct ?? 0,
  }));

  const { error: ingError } = await supabase.from("recipe_ingredients").insert(ingredientRows);

  if (ingError) {
    await supabase.from("recipes").delete().eq("id", recipe.id);
    return { error: ingError.message };
  }

  // Calculate total_cost if possible
  const ingredientIds = parsed.data.ingredients.map((i) => i.ingredient_id);
  const { data: costs } = await supabase
    .from("ingredients")
    .select("id, cost_price")
    .in("id", ingredientIds);

  if (costs && costs.length > 0) {
    const costMap = new Map<number, number>(
      costs.map((c: { id: number; cost_price: number | null }) => [c.id, Number(c.cost_price ?? 0)])
    );
    let totalCost = 0;
    for (const ing of parsed.data.ingredients) {
      const costPrice = costMap.get(ing.ingredient_id) ?? 0;
      const wasteFactor = 1 + (ing.waste_pct ?? 0) / 100;
      totalCost += costPrice * ing.quantity * wasteFactor;
    }

    if (totalCost > 0) {
      await supabase
        .from("recipes")
        .update({ total_cost: Math.round(totalCost * 100) / 100 })
        .eq("id", recipe.id);
    }
  }

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const createRecipe = withServerAction(_createRecipe);

async function _deleteRecipe(id: number) {
  const { supabase, tenantId } = await getActionContext();

  // Verify recipe belongs to this tenant via menu_items
  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, menu_items!inner(tenant_id)")
    .eq("id", id)
    .eq("menu_items.tenant_id", tenantId)
    .single();
  if (!recipe) return { error: "Công thức không tồn tại hoặc không thuộc đơn vị của bạn" };

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const deleteRecipe = withServerAction(_deleteRecipe);
