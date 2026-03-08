import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { validateBody, z } from "../_shared/validate.ts";
import { extractUser, createAdminClient } from "../_shared/auth.ts";
import { checkIdempotency, saveIdempotencyResponse } from "../_shared/idempotency.ts";

const EarnPointsSchema = z.object({
  member_id: z.number().int().positive("ID thành viên phải là số nguyên dương."),
  order_id: z.number().int().positive("ID đơn hàng phải là số nguyên dương."),
  amount: z.number().positive("Số tiền phải lớn hơn 0."),
});

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "POST") {
    return errorResponse("VALIDATION_ERROR", "Chỉ hỗ trợ phương thức POST.", 405);
  }

  // Auth: cashier required
  const [user, authError] = await extractUser(req, ["cashier", "manager", "owner"]);
  if (authError) return authError;

  const adminClient = createAdminClient();

  // Idempotency check
  const [idempotencyKey, idempotencyError] = await checkIdempotency(req, adminClient);
  if (idempotencyError) return idempotencyError;

  // Validate input
  const [body, validationError] = await validateBody(req, EarnPointsSchema);
  if (validationError) return validationError;

  const { member_id, order_id, amount } = body;

  if (amount <= 0) {
    return errorResponse(
      "INVALID_AMOUNT",
      "Số tiền thanh toán phải lớn hơn 0.",
      422,
    );
  }

  try {
    // 1. Get customer with optimistic locking version
    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .select(`
        id, full_name, total_points, available_points, lifetime_points,
        version, loyalty_tier_id, tenant_id
      `)
      .eq("id", member_id)
      .single();

    if (customerError || !customer) {
      return errorResponse(
        "MEMBER_NOT_FOUND",
        "Không tìm thấy thành viên với ID này.",
        404,
      );
    }

    // 2. Get current tier for multiplier
    let tierMultiplier = 1.0;
    let currentTierCode: string | null = null;
    let currentTierName: string | null = null;

    if (customer.loyalty_tier_id) {
      const { data: tier } = await adminClient
        .from("loyalty_tiers")
        .select("id, name, tier_code, point_multiplier")
        .eq("id", customer.loyalty_tier_id)
        .single();

      if (tier) {
        tierMultiplier = Number(tier.point_multiplier);
        currentTierCode = tier.tier_code;
        currentTierName = tier.name;
      }
    }

    // 3. Calculate points: floor(amount / 10000) × tier_multiplier
    const basePoints = Math.floor(amount / 10000);
    const pointsEarned = Math.floor(basePoints * tierMultiplier);

    if (pointsEarned <= 0) {
      // Amount too small to earn points — still record it
      const responseData = {
        points_earned: 0,
        new_balance: customer.available_points,
        total_points: customer.total_points,
        tier_change: null,
        transaction_id: null,
        version: customer.version,
      };
      if (idempotencyKey) {
        await saveIdempotencyResponse(adminClient, idempotencyKey, { success: true, data: responseData }, 200);
      }
      return successResponse(responseData);
    }

    // 4. Update customer balance with optimistic locking
    const newAvailablePoints = customer.available_points + pointsEarned;
    const newTotalPoints = customer.total_points + pointsEarned;
    const newLifetimePoints = customer.lifetime_points + pointsEarned;
    const newVersion = customer.version + 1;

    const { data: updatedCustomer, error: updateError } = await adminClient
      .from("customers")
      .update({
        available_points: newAvailablePoints,
        total_points: newTotalPoints,
        lifetime_points: newLifetimePoints,
        version: newVersion,
      })
      .eq("id", member_id)
      .eq("version", customer.version) // Optimistic lock
      .select("id, version")
      .single();

    if (updateError || !updatedCustomer) {
      return errorResponse(
        "VERSION_CONFLICT",
        "Dữ liệu đã bị thay đổi bởi giao dịch khác. Vui lòng thử lại.",
        409,
      );
    }

    // 5. Create loyalty transaction record
    const { data: transaction, error: txError } = await adminClient
      .from("loyalty_transactions")
      .insert({
        customer_id: member_id,
        tenant_id: customer.tenant_id,
        points: pointsEarned,
        type: "earn",
        reference_type: "order",
        reference_id: order_id,
        balance_after: newAvailablePoints,
        description: `Tích điểm đơn #${order_id}`,
      })
      .select("id")
      .single();

    if (txError) {
      console.error("Lỗi tạo giao dịch tích điểm:", txError);
      // Rollback the customer update
      await adminClient
        .from("customers")
        .update({
          available_points: customer.available_points,
          total_points: customer.total_points,
          lifetime_points: customer.lifetime_points,
          version: customer.version,
        })
        .eq("id", member_id);

      return errorResponse(
        "INTERNAL_ERROR",
        "Không thể ghi nhận giao dịch tích điểm. Vui lòng thử lại.",
        500,
      );
    }

    // 6. Check if tier upgrade happened (trigger auto_upgrade_loyalty_tier handles this)
    // Re-fetch customer to see if tier changed
    const { data: refreshedCustomer } = await adminClient
      .from("customers")
      .select("loyalty_tier_id")
      .eq("id", member_id)
      .single();

    let tierChange = null;
    if (refreshedCustomer && refreshedCustomer.loyalty_tier_id !== customer.loyalty_tier_id) {
      const { data: newTier } = await adminClient
        .from("loyalty_tiers")
        .select("id, name, tier_code")
        .eq("id", refreshedCustomer.loyalty_tier_id)
        .single();

      if (newTier) {
        tierChange = {
          from: {
            name: currentTierName ?? "Không",
            tier_code: currentTierCode ?? "none",
          },
          to: {
            name: newTier.name,
            tier_code: newTier.tier_code,
          },
          upgraded_at: new Date().toISOString(),
        };
      }
    }

    const responseData = {
      points_earned: pointsEarned,
      new_balance: newAvailablePoints,
      total_points: newTotalPoints,
      tier_change: tierChange,
      transaction_id: transaction?.id ?? null,
      version: newVersion,
    };

    // Save idempotency response
    if (idempotencyKey) {
      await saveIdempotencyResponse(adminClient, idempotencyKey, { success: true, data: responseData }, 200);
    }

    return successResponse(responseData);
  } catch (err) {
    console.error("Lỗi hệ thống khi tích điểm:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});
