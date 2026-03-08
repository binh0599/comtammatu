import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { validateQuery, z } from "../_shared/validate.ts";
import { createAdminClient } from "../_shared/auth.ts";

const MenuQuerySchema = z.object({
  branch_id: z
    .string()
    .regex(/^\d+$/, "branch_id phải là số nguyên.")
    .transform(Number),
  category_id: z
    .string()
    .regex(/^\d+$/, "category_id phải là số nguyên.")
    .transform(Number)
    .optional(),
});

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "GET") {
    return errorResponse("VALIDATION_ERROR", "Chỉ hỗ trợ phương thức GET.", 405);
  }

  // Validate query params
  const [params, validationError] = validateQuery(req, MenuQuerySchema);
  if (validationError) return validationError;

  const { branch_id, category_id } = params;

  try {
    const adminClient = createAdminClient();

    // 1. Verify branch exists and get its menu
    const { data: branch, error: branchError } = await adminClient
      .from("branches")
      .select("id, name, tenant_id")
      .eq("id", branch_id)
      .eq("is_active", true)
      .single();

    if (branchError || !branch) {
      return errorResponse(
        "NOT_FOUND",
        "Không tìm thấy chi nhánh hoặc chi nhánh đã ngưng hoạt động.",
        404,
      );
    }

    // 2. Find menu linked to this branch
    const { data: menuBranch } = await adminClient
      .from("menu_branches")
      .select("menu_id")
      .eq("branch_id", branch_id)
      .limit(1)
      .maybeSingle();

    if (!menuBranch) {
      return errorResponse(
        "NOT_FOUND",
        "Chi nhánh này chưa có thực đơn.",
        404,
      );
    }

    const menuId = menuBranch.menu_id;

    // 3. Get categories
    let categoryQuery = adminClient
      .from("menu_categories")
      .select("id, name, type, sort_order, image_url")
      .eq("menu_id", menuId)
      .order("sort_order", { ascending: true });

    if (category_id) {
      categoryQuery = categoryQuery.eq("id", category_id);
    }

    const { data: categories, error: catError } = await categoryQuery;

    if (catError) {
      console.error("Lỗi lấy danh mục:", catError);
      return errorResponse(
        "INTERNAL_ERROR",
        "Không thể tải danh mục thực đơn.",
        500,
      );
    }

    if (!categories || categories.length === 0) {
      return successResponse({ categories: [] });
    }

    // 4. Get all items for the categories
    const categoryIds = categories.map((c) => c.id);
    const { data: items, error: itemError } = await adminClient
      .from("menu_items")
      .select(`
        id, category_id, name, description, base_price,
        image_url, prep_time_min, is_available, allergens, nutrition
      `)
      .in("category_id", categoryIds)
      .eq("is_available", true)
      .order("name", { ascending: true });

    if (itemError) {
      console.error("Lỗi lấy món ăn:", itemError);
      return errorResponse(
        "INTERNAL_ERROR",
        "Không thể tải danh sách món ăn.",
        500,
      );
    }

    // 5. Get branch-specific availability overrides
    const itemIds = (items ?? []).map((i) => i.id);
    const { data: availabilityOverrides } = await adminClient
      .from("menu_item_branch_availability")
      .select("menu_item_id, is_available, reason")
      .eq("branch_id", branch_id)
      .in("menu_item_id", itemIds);

    const availabilityMap = new Map<number, { is_available: boolean; reason: string | null }>();
    (availabilityOverrides ?? []).forEach((a) => {
      availabilityMap.set(a.menu_item_id, {
        is_available: a.is_available,
        reason: a.reason,
      });
    });

    // 6. Get modifiers for all items
    const { data: modifiers } = await adminClient
      .from("menu_item_modifiers")
      .select("id, menu_item_id, name, options, max_selections, is_required")
      .in("menu_item_id", itemIds);

    const modifiersByItem = new Map<number, typeof modifiers>();
    (modifiers ?? []).forEach((m) => {
      const existing = modifiersByItem.get(m.menu_item_id) ?? [];
      existing.push(m);
      modifiersByItem.set(m.menu_item_id, existing);
    });

    // 7. Build response
    const categoriesWithItems = categories.map((cat) => {
      const categoryItems = (items ?? [])
        .filter((item) => item.category_id === cat.id)
        .map((item) => {
          const override = availabilityMap.get(item.id);
          const isAvailable = override ? override.is_available : item.is_available;

          return {
            id: item.id,
            name: item.name,
            description: item.description,
            base_price: Number(item.base_price),
            image_url: item.image_url,
            prep_time_min: item.prep_time_min,
            is_available: isAvailable,
            unavailable_reason: override && !override.is_available ? override.reason : null,
            allergens: item.allergens,
            nutrition: item.nutrition,
            modifiers: (modifiersByItem.get(item.id) ?? []).map((m) => ({
              id: m.id,
              name: m.name,
              options: m.options,
              max_selections: m.max_selections,
              is_required: m.is_required,
            })),
          };
        });

      return {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        sort_order: cat.sort_order,
        image_url: cat.image_url,
        items: categoryItems,
      };
    });

    return successResponse({
      branch: {
        id: branch.id,
        name: branch.name,
      },
      categories: categoriesWithItems,
    });
  } catch (err) {
    console.error("Lỗi hệ thống khi lấy thực đơn:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});
