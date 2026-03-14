import { type NextRequest } from "next/server";
import { getMobileCustomer, checkMobileRateLimit, jsonOk, jsonError } from "../helpers";

/**
 * GET /api/mobile/vouchers
 * Requires authentication.
 * Fetch available vouchers for customer's tenant.
 */
export async function GET(_req: NextRequest) {
  try {
    const result = await getMobileCustomer();
    if ("error" in result) {
      return result.error;
    }

    const { supabase, customer } = result;

    // Rate limit by customer ID
    const rateLimitResponse = await checkMobileRateLimit(`vouchers:${customer.id}`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // customer.tenant_id is available directly from the customers table
    if (!customer.tenant_id) {
      return jsonError(
        "Không thể xác định cửa hàng. Vui lòng liên hệ hỗ trợ.",
        500,
      );
    }

    // Fetch active vouchers for this tenant that are still valid
    const now = new Date().toISOString();
    const { data: vouchers, error } = await supabase
      .from("vouchers")
      .select(
        "id, code, type, value, min_order, max_discount, max_uses, used_count, is_active, valid_from, valid_to",
      )
      .eq("tenant_id", customer.tenant_id)
      .eq("is_active", true)
      .gte("valid_to", now)
      .lte("valid_from", now)
      .order("valid_to", { ascending: true });

    if (error) {
      console.error("Error fetching vouchers:", error);
      return jsonError(
        "Không thể tải mã giảm giá. Vui lòng thử lại sau.",
        500,
      );
    }

    // Filter out fully-used vouchers
    const available = (vouchers ?? []).filter(
      (v) => v.max_uses === null || v.max_uses === 0 || (v.used_count ?? 0) < v.max_uses,
    );

    return jsonOk({
      vouchers: available,
    });
  } catch (error) {
    console.error("[GET /api/mobile/vouchers]", error);
    return jsonError(
      "Lỗi máy chủ. Vui lòng thử lại sau.",
      500,
    );
  }
}
