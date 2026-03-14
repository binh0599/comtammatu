import { createSupabaseServer } from "@comtammatu/database";
import type { NextRequest } from "next/server";
import { jsonOk, jsonError } from "../helpers";

/**
 * GET /api/mobile/stores
 * Public endpoint: Fetch list of all branches/stores.
 * No authentication required.
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Fetch all active branches with relevant info
    const { data: branches, error } = await supabase
      .from("branches")
      .select(
        `
        id,
        name,
        address,
        phone,
        opening_hours,
        latitude,
        longitude,
        is_active
      `
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching branches:", error);
      return jsonError("Không thể tải danh sách chi nhánh. Vui lòng thử lại sau.", 500);
    }

    return jsonOk({
      stores: branches ?? [],
    });
  } catch (error) {
    console.error("[GET /api/mobile/stores]", error);
    return jsonError("Lỗi máy chủ. Vui lòng thử lại sau.", 500);
  }
}
