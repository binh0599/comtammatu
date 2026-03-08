import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { validateBody, z } from "../_shared/validate.ts";
import { extractUser, createAdminClient } from "../_shared/auth.ts";
import { checkIdempotency, saveIdempotencyResponse } from "../_shared/idempotency.ts";

const RedeemSchema = z.object({
  reward_id: z.number().int().positive("ID phần thưởng phải là số nguyên dương."),
  points: z.number().int().positive("Số điểm phải là số nguyên dương."),
});

/**
 * Generate a unique voucher code: RDM-YYYY-<redemption_id>
 */
function generateVoucherCode(redemptionId: number): string {
  const year = new Date().getFullYear();
  return `RDM-${year}-${redemptionId}`;
}

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "POST") {
    return errorResponse("VALIDATION_ERROR", "Chỉ hỗ trợ phương thức POST.", 405);
  }

  // Auth: customer required
  const [user, authError] = await extractUser(req, ["customer"]);
  if (authError) return authError;

  const adminClient = createAdminClient();

  // Idempotency check
  const [idempotencyKey, idempotencyError] = await checkIdempotency(req, adminClient);
  if (idempotencyError) return idempotencyError;

  // Validate input
  const [body, validationError] = await validateBody(req, RedeemSchema);
  if (validationError) return validationError;

  const { reward_id, points } = body;

  try {
    // 1. Get customer linked to auth user
    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .select("id, available_points, total_points, version, tenant_id, loyalty_tier_id")
      .eq("auth_user_id", user.id)
      .single();

    if (customerError || !customer) {
      return errorResponse(
        "NOT_FOUND",
        "Không tìm thấy thông tin thành viên.",
        404,
      );
    }

    // 2. Get reward
    const { data: reward, error: rewardError } = await adminClient
      .from("rewards")
      .select("id, name, description, points_required, stock, min_tier_id, is_active, expires_at")
      .eq("id", reward_id)
      .single();

    if (rewardError || !reward) {
      return errorResponse(
        "NOT_FOUND",
        "Không tìm thấy phần thưởng với ID này.",
        404,
      );
    }

    // 3. Check reward availability
    if (!reward.is_active) {
      return errorResponse(
        "REWARD_UNAVAILABLE",
        "Phần thưởng này hiện không khả dụng.",
        422,
      );
    }

    if (reward.expires_at && new Date(reward.expires_at) < new Date()) {
      return errorResponse(
        "REWARD_UNAVAILABLE",
        "Phần thưởng này đã hết hạn.",
        422,
      );
    }

    if (reward.stock !== null && reward.stock <= 0) {
      return errorResponse(
        "REWARD_UNAVAILABLE",
        "Phần thưởng này đã hết hàng.",
        422,
      );
    }

    // 4. Check tier restriction
    if (reward.min_tier_id) {
      const { data: minTier } = await adminClient
        .from("loyalty_tiers")
        .select("min_points")
        .eq("id", reward.min_tier_id)
        .single();

      const { data: currentTier } = customer.loyalty_tier_id
        ? await adminClient
            .from("loyalty_tiers")
            .select("min_points")
            .eq("id", customer.loyalty_tier_id)
            .single()
        : { data: { min_points: 0 } };

      if (
        minTier &&
        currentTier &&
        (currentTier.min_points ?? 0) < minTier.min_points
      ) {
        return errorResponse(
          "REWARD_TIER_RESTRICTED",
          "Hạng thành viên hiện tại của bạn chưa đủ điều kiện đổi phần thưởng này.",
          422,
        );
      }
    }

    // 5. Check points requirement
    if (points < reward.points_required) {
      return errorResponse(
        "VALIDATION_ERROR",
        `Phần thưởng này cần ${reward.points_required} điểm.`,
        400,
      );
    }

    // 6. Check available points
    if (customer.available_points < points) {
      return errorResponse(
        "INSUFFICIENT_POINTS",
        `Bạn không đủ điểm để đổi phần thưởng này. Bạn có ${customer.available_points} điểm, cần ${points} điểm.`,
        422,
      );
    }

    // 7. Deduct points with optimistic locking
    const newAvailablePoints = customer.available_points - points;
    const newTotalPoints = customer.total_points - points;
    const newVersion = customer.version + 1;

    const { data: updatedCustomer, error: updateError } = await adminClient
      .from("customers")
      .update({
        available_points: newAvailablePoints,
        total_points: newTotalPoints,
        version: newVersion,
      })
      .eq("id", customer.id)
      .eq("version", customer.version)
      .select("id, version")
      .single();

    if (updateError || !updatedCustomer) {
      return errorResponse(
        "VERSION_CONFLICT",
        "Dữ liệu đã bị thay đổi. Vui lòng thử lại.",
        409,
      );
    }

    // 8. Create redemption record (to get ID for voucher code)
    // First insert with a temp voucher code, then update
    const voucherExpiry = new Date();
    voucherExpiry.setDate(voucherExpiry.getDate() + 7); // Voucher valid for 7 days

    const { data: redemption, error: redemptionError } = await adminClient
      .from("redemptions")
      .insert({
        customer_id: customer.id,
        reward_id: reward_id,
        tenant_id: customer.tenant_id,
        points_deducted: points,
        voucher_code: `TEMP-${Date.now()}`,
        expires_at: voucherExpiry.toISOString(),
      })
      .select("id")
      .single();

    if (redemptionError || !redemption) {
      console.error("Lỗi tạo redemption:", redemptionError);
      // Rollback customer points
      await adminClient
        .from("customers")
        .update({
          available_points: customer.available_points,
          total_points: customer.total_points,
          version: customer.version,
        })
        .eq("id", customer.id);

      return errorResponse(
        "INTERNAL_ERROR",
        "Không thể tạo phiếu đổi thưởng. Vui lòng thử lại.",
        500,
      );
    }

    // Update with proper voucher code
    const voucherCode = generateVoucherCode(redemption.id);
    await adminClient
      .from("redemptions")
      .update({ voucher_code: voucherCode })
      .eq("id", redemption.id);

    // 9. Decrease reward stock if applicable
    if (reward.stock !== null) {
      await adminClient
        .from("rewards")
        .update({ stock: reward.stock - 1 })
        .eq("id", reward_id);
    }

    // 10. Create loyalty transaction for the redemption
    await adminClient
      .from("loyalty_transactions")
      .insert({
        customer_id: customer.id,
        tenant_id: customer.tenant_id,
        points: -points,
        type: "redeem",
        reference_type: "redemption",
        reference_id: redemption.id,
        balance_after: newAvailablePoints,
        description: `Đổi điểm: ${reward.name}`,
      });

    const responseData = {
      redemption_id: redemption.id,
      reward: {
        id: reward.id,
        name: reward.name,
        description: reward.description,
        points_required: reward.points_required,
        voucher_code: voucherCode,
        expires_at: voucherExpiry.toISOString(),
      },
      points_deducted: points,
      new_balance: newAvailablePoints,
      version: newVersion,
    };

    // Save idempotency response
    if (idempotencyKey) {
      await saveIdempotencyResponse(adminClient, idempotencyKey, { success: true, data: responseData }, 200);
    }

    return successResponse(responseData);
  } catch (err) {
    console.error("Lỗi hệ thống khi đổi điểm:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});
