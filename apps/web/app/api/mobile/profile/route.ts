import type { NextRequest } from "next/server";
import { getMobileCustomer, checkMobileRateLimit, jsonOk, jsonError } from "../helpers";

/**
 * GET /api/mobile/profile
 * Requires authentication.
 * Fetch authenticated customer's profile and stats.
 */
export async function GET(_req: NextRequest) {
  try {
    const result = await getMobileCustomer();
    if ("error" in result) {
      return result.error;
    }

    const { supabase, customer } = result;

    // Rate limit by customer ID
    const rateLimitResponse = await checkMobileRateLimit(`profile:${customer.id}`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get order stats for total spent and visits
    const { data: orderStats, error: statsError } = await supabase
      .from("orders")
      .select("total")
      .eq("customer_id", customer.id)
      .eq("status", "completed");

    if (statsError) {
      console.error("Error fetching order stats:", statsError);
      return jsonError("Không thể tải thống kê đơn hàng. Vui lòng thử lại sau.", 500);
    }

    const totalSpent = (orderStats ?? []).reduce((sum, o) => sum + (o.total || 0), 0);
    const totalVisits = orderStats?.length ?? 0;

    return jsonOk({
      id: customer.id,
      fullName: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      gender: customer.gender ?? null,
      birthday: customer.birthday ?? null,
      totalSpent,
      totalVisits,
      createdAt: customer.created_at,
    });
  } catch (error) {
    console.error("[GET /api/mobile/profile]", error);
    return jsonError("Lỗi máy chủ. Vui lòng thử lại sau.", 500);
  }
}
