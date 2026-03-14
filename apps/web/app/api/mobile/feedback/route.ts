import type { NextRequest } from "next/server";
import { z } from "zod";
import { getMobileCustomer, checkMobileRateLimit, jsonOk, jsonError } from "../helpers";

/**
 * Feedback submission schema for mobile app
 */
const submitFeedbackSchema = z.object({
  order_id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1, "Đánh giá tối thiểu 1 sao").max(5, "Đánh giá tối đa 5 sao"),
  comment: z.string().max(1000).optional().or(z.literal("")),
});

type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

/**
 * POST /api/mobile/feedback
 * Requires authentication.
 * Submit feedback for a completed order.
 */
export async function POST(req: NextRequest) {
  try {
    const result = await getMobileCustomer();
    if ("error" in result) {
      return result.error;
    }

    const { supabase, customer } = result;

    // Rate limit by customer ID
    const rateLimitResponse = await checkMobileRateLimit(`feedback:${customer.id}`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate body
    const body = await req.json();
    let input: SubmitFeedbackInput;

    try {
      input = submitFeedbackSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const firstError = validationError.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
        return jsonError(firstError, 400);
      }
      return jsonError("Dữ liệu không hợp lệ.", 400);
    }

    // Verify order belongs to customer
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, branch_id")
      .eq("id", input.order_id)
      .eq("customer_id", customer.id)
      .maybeSingle();

    if (orderError) {
      console.error("Error verifying order:", orderError);
      return jsonError(
        "Không thể xác minh đơn hàng. Vui lòng thử lại sau.",
        500,
      );
    }

    if (!order) {
      return jsonError(
        "Không tìm thấy đơn hàng. Đơn hàng không tồn tại hoặc không thuộc về bạn.",
        404,
      );
    }

    // Check if feedback already exists for this order
    const { data: existingFeedback, error: checkError } = await supabase
      .from("customer_feedback")
      .select("id")
      .eq("order_id", input.order_id)
      .eq("customer_id", customer.id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing feedback:", checkError);
      return jsonError(
        "Không thể kiểm tra phản hồi. Vui lòng thử lại sau.",
        500,
      );
    }

    if (existingFeedback) {
      return jsonError(
        "Bạn đã gửi phản hồi cho đơn hàng này rồi.",
        409,
      );
    }

    // Insert feedback
    const { error: insertError } = await supabase
      .from("customer_feedback")
      .insert({
        customer_id: customer.id,
        order_id: input.order_id,
        branch_id: order.branch_id,
        rating: input.rating,
        comment: input.comment || null,
      });

    if (insertError) {
      console.error("Error inserting feedback:", insertError);
      return jsonError(
        "Không thể lưu phản hồi. Vui lòng thử lại sau.",
        500,
      );
    }

    return jsonOk({ success: true }, 201);
  } catch (error) {
    console.error("[POST /api/mobile/feedback]", error);
    return jsonError(
      "Lỗi máy chủ. Vui lòng thử lại sau.",
      500,
    );
  }
}
