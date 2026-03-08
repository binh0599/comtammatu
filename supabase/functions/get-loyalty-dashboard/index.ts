import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { extractUser, createAdminClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "GET") {
    return errorResponse("VALIDATION_ERROR", "Chỉ hỗ trợ phương thức GET.", 405);
  }

  // Auth: customer required
  const [user, authError] = await extractUser(req, ["customer"]);
  if (authError) return authError;

  try {
    const adminClient = createAdminClient();

    // 1. Get customer record linked to auth user
    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .select(`
        id, full_name, phone, avatar_url,
        total_points, available_points, lifetime_points, version,
        loyalty_tier_id, streak_days, last_checkin_date,
        tenant_id
      `)
      .eq("auth_user_id", user.id)
      .single();

    if (customerError || !customer) {
      return errorResponse(
        "NOT_FOUND",
        "Không tìm thấy thông tin thành viên. Vui lòng liên hệ hỗ trợ.",
        404,
      );
    }

    // 2. Get current tier info
    let tierData = null;
    if (customer.loyalty_tier_id) {
      const { data: tier } = await adminClient
        .from("loyalty_tiers")
        .select("id, name, tier_code, point_multiplier, cashback_percent, benefits, min_points")
        .eq("id", customer.loyalty_tier_id)
        .single();

      if (tier) {
        // Find next tier
        const { data: nextTier } = await adminClient
          .from("loyalty_tiers")
          .select("id, name, tier_code, min_points")
          .eq("tenant_id", customer.tenant_id)
          .gt("min_points", tier.min_points)
          .order("min_points", { ascending: true })
          .limit(1)
          .maybeSingle();

        const benefits = formatBenefits(tier);

        tierData = {
          id: tier.id,
          name: tier.name,
          tier_code: tier.tier_code,
          point_multiplier: Number(tier.point_multiplier),
          cashback_percent: Number(tier.cashback_percent),
          benefits,
          next_tier: nextTier
            ? {
                name: nextTier.name,
                tier_code: nextTier.tier_code,
                min_points: nextTier.min_points,
                points_needed: nextTier.min_points - customer.lifetime_points,
                progress_percent:
                  nextTier.min_points > 0
                    ? Math.round((customer.lifetime_points / nextTier.min_points) * 10000) / 100
                    : 100,
              }
            : null,
        };
      }
    } else {
      // No tier assigned — get the lowest tier
      const { data: baseTier } = await adminClient
        .from("loyalty_tiers")
        .select("id, name, tier_code, point_multiplier, cashback_percent, benefits, min_points")
        .eq("tenant_id", customer.tenant_id)
        .order("min_points", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (baseTier) {
        const { data: nextTier } = await adminClient
          .from("loyalty_tiers")
          .select("id, name, tier_code, min_points")
          .eq("tenant_id", customer.tenant_id)
          .gt("min_points", baseTier.min_points)
          .order("min_points", { ascending: true })
          .limit(1)
          .maybeSingle();

        tierData = {
          id: baseTier.id,
          name: baseTier.name,
          tier_code: baseTier.tier_code,
          point_multiplier: Number(baseTier.point_multiplier),
          cashback_percent: Number(baseTier.cashback_percent),
          benefits: formatBenefits(baseTier),
          next_tier: nextTier
            ? {
                name: nextTier.name,
                tier_code: nextTier.tier_code,
                min_points: nextTier.min_points,
                points_needed: Math.max(0, nextTier.min_points - customer.lifetime_points),
                progress_percent:
                  nextTier.min_points > 0
                    ? Math.round((customer.lifetime_points / nextTier.min_points) * 10000) / 100
                    : 100,
              }
            : null,
        };
      }
    }

    // 3. Recent transactions (last 10)
    const { data: recentTransactions } = await adminClient
      .from("loyalty_transactions")
      .select("id, type, points, balance_after, description, reference_type, reference_id, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // 4. Active promotions/campaigns
    const now = new Date().toISOString();
    const { data: campaigns } = await adminClient
      .from("campaigns")
      .select("id, name, type, content, scheduled_at, status, created_at")
      .eq("tenant_id", customer.tenant_id)
      .eq("status", "active")
      .limit(10);

    const activePromotions = (campaigns ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.content?.description ?? "",
      image_url: c.content?.image_url ?? null,
      cashback_type: c.content?.cashback_type ?? "percent",
      cashback_value: c.content?.cashback_value ?? 0,
      start_date: c.content?.start_date ?? c.created_at,
      end_date: c.content?.end_date ?? null,
      eligible: true,
    }));

    // 5. Stats — this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString();

    const { count: checkinsThisMonth } = await adminClient
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .gte("checked_in_at", monthStartStr);

    const { count: ordersThisMonth } = await adminClient
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .gte("created_at", monthStartStr);

    return successResponse({
      member: {
        id: customer.id,
        full_name: customer.full_name,
        phone: customer.phone,
        avatar_url: customer.avatar_url,
        total_points: customer.total_points,
        available_points: customer.available_points,
        lifetime_points: customer.lifetime_points,
        version: customer.version,
      },
      tier: tierData,
      recent_transactions: (recentTransactions ?? []).map((t) => ({
        id: t.id,
        type: t.type,
        points: t.points,
        balance_after: t.balance_after,
        description: t.description ?? descriptionForType(t.type, t.reference_type, t.reference_id),
        reference_type: t.reference_type,
        reference_id: t.reference_id,
        created_at: t.created_at,
      })),
      active_promotions: activePromotions,
      stats: {
        total_checkins_this_month: checkinsThisMonth ?? 0,
        total_orders_this_month: ordersThisMonth ?? 0,
        streak_days: customer.streak_days,
      },
    });
  } catch (err) {
    console.error("Lỗi hệ thống khi lấy loyalty dashboard:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});

/**
 * Format benefits from JSONB to a list of human-readable strings.
 */
function formatBenefits(tier: {
  tier_code: string | null;
  point_multiplier: string | number;
  cashback_percent: string | number;
  benefits: Record<string, unknown> | null;
}): string[] {
  const list: string[] = [];
  const multiplier = Number(tier.point_multiplier);
  const cashback = Number(tier.cashback_percent);

  if (multiplier > 1) list.push(`Tích điểm x${multiplier}`);
  if (cashback > 0) list.push(`Cashback ${cashback}%`);

  const b = tier.benefits;
  if (b) {
    if (b.welcome_drink) list.push("Nước chào miễn phí");
    if (b.priority_seating) list.push("Ưu tiên đặt bàn");
    if (b.free_delivery) list.push("Miễn phí giao hàng");
    if (typeof b.birthday_discount === "number" && b.birthday_discount > 0) {
      list.push(`Giảm ${b.birthday_discount}% ngày sinh nhật`);
    }
  }
  return list;
}

/**
 * Generate a default description for a transaction type.
 */
function descriptionForType(
  type: string,
  referenceType: string | null,
  referenceId: number | null,
): string {
  switch (type) {
    case "earn":
      return referenceId ? `Tích điểm đơn #${referenceId}` : "Tích điểm";
    case "redeem":
      return "Đổi điểm lấy phần thưởng";
    case "checkin_bonus":
      return "Điểm thưởng check-in";
    case "cashback":
      return "Hoàn điểm cashback";
    case "expire":
      return "Điểm hết hạn";
    case "adjust":
      return "Điều chỉnh điểm";
    default:
      return "Giao dịch điểm";
  }
}
