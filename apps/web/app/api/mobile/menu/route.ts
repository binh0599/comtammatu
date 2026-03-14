import { createSupabaseServer } from "@comtammatu/database";
import type { NextRequest } from "next/server";
import { jsonOk, jsonError } from "../helpers";

/**
 * GET /api/mobile/menu
 * Public endpoint: Fetch available menu items and categories.
 * No authentication required.
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Fetch all active menu items with their categories
    const { data: items, error: itemsError } = await supabase
      .from("menu_items")
      .select(
        `
        id,
        name,
        description,
        price,
        image_url,
        is_available,
        category_id,
        menu_categories!inner(id, name, display_order)
      `
      )
      .eq("is_available", true)
      .order("display_order", { ascending: true });

    if (itemsError) {
      console.error("Error fetching menu items:", itemsError);
      return jsonError("Không thể tải menu. Vui lòng thử lại sau.", 500);
    }

    // Fetch all menu categories
    const { data: categories, error: categoriesError } = await supabase
      .from("menu_categories")
      .select("id, name, display_order")
      .order("display_order", { ascending: true });

    if (categoriesError) {
      console.error("Error fetching menu categories:", categoriesError);
      return jsonError("Không thể tải danh mục menu. Vui lòng thử lại sau.", 500);
    }

    return jsonOk({
      items: items ?? [],
      categories: categories ?? [],
    });
  } catch (error) {
    console.error("[GET /api/mobile/menu]", error);
    return jsonError("Lỗi máy chủ. Vui lòng thử lại sau.", 500);
  }
}
