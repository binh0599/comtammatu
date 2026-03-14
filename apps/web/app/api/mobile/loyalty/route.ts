import { type NextRequest } from "next/server";
import { getMobileCustomer, checkMobileRateLimit, jsonOk, jsonError } from "../helpers";

/**
 * GET /api/mobile/loyalty
 * Requires authentication.
 * Fetch loyalty dashboard with points, tier info, and recent transactions.
 */
export async function GET(_req: NextRequest) {
  try {
    const result = await getMobileCustomer();
    if ("error" in result) {
      return result.error;
    }

    const { supabase, customer } = result;

    // Rate limit by customer ID
    const rateLimitResponse = await checkMobileRateLimit(`loyalty:${customer.id}`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get current loyalty points (sum of all transactions)
    const { data: pointsData, error: pointsError } = await supabase
      .from("loyalty_transactions")
      .select("points")
      .eq("customer_id", customer.id);

    if (pointsError) {
      console.error("Error fetching loyalty points:", pointsError);
      return jsonError("Không thể tải thông tin điểm thưởng. Vui lòng thử lại sau.", 500);
    }

    const currentPoints = (pointsData ?? []).reduce(
      (sum: number, t: { points: number | null }) => sum + (t.points ?? 0),
      0
    );

    // Get current tier — match by loyalty_tier_id on customer record,
    // or fallback to the highest tier where min_points <= currentPoints
    let tierName = "Thành viên";
    let tierDiscountPct = 0;

    if (customer.loyalty_tier_id) {
      const { data: tier } = await supabase
        .from("loyalty_tiers")
        .select("name, discount_pct, min_points")
        .eq("id", customer.loyalty_tier_id)
        .single();

      if (tier) {
        tierName = tier.name;
        tierDiscountPct = tier.discount_pct ?? 0;
      }
    }

    // Get all tiers for next tier calculation
    const { data: allTiers } = await supabase
      .from("loyalty_tiers")
      .select("id, name, min_points, discount_pct")
      .eq("tenant_id", customer.tenant_id)
      .order("min_points");

    // Find next tier
    let nextTier: { name: string; minPoints: number; pointsNeeded: number } | null = null;
    if (allTiers) {
      for (const t of allTiers) {
        if (t.min_points > currentPoints) {
          nextTier = {
            name: t.name,
            minPoints: t.min_points,
            pointsNeeded: Math.max(0, t.min_points - currentPoints),
          };
          break;
        }
      }
    }

    // Get recent transactions (last 10)
    const { data: transactions, error: transError } = await supabase
      .from("loyalty_transactions")
      .select("id, type, points, balance_after, reference_type, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (transError) {
      console.error("Error fetching transactions:", transError);
      return jsonError("Không thể tải lịch sử giao dịch. Vui lòng thử lại sau.", 500);
    }

    return jsonOk({
      currentPoints,
      tierName,
      tierDiscountPct,
      nextTier,
      transactions: transactions ?? [],
      totalSpent: customer.total_spent,
      totalVisits: customer.total_visits,
    });
  } catch (error) {
    console.error("[GET /api/mobile/loyalty]", error);
    return jsonError("Lỗi máy chủ. Vui lòng thử lại sau.", 500);
  }
}
