import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { validateBody, z } from "../_shared/validate.ts";
import { createAdminClient } from "../_shared/auth.ts";

const VerifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Số điện thoại không hợp lệ."),
  otp: z
    .string()
    .regex(/^\d{6}$/, "Mã OTP phải gồm 6 chữ số."),
  type: z.enum(["signup", "login", "password_reset"], {
    errorMap: () => ({
      message: "Loại xác thực phải là 'signup', 'login' hoặc 'password_reset'.",
    }),
  }),
});

// Map our type to Supabase OTP type
function mapOtpType(type: string): "sms" | "phone_change" {
  // Supabase uses "sms" for phone-based OTP verification
  return "sms";
}

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "POST") {
    return errorResponse("VALIDATION_ERROR", "Chỉ hỗ trợ phương thức POST.", 405);
  }

  const [body, validationError] = await validateBody(req, VerifyOtpSchema);
  if (validationError) return validationError;

  const { phone, otp, type } = body;

  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.auth.verifyOtp({
      phone,
      token: otp,
      type: mapOtpType(type),
    });

    if (error) {
      if (error.message?.includes("expired") || error.message?.includes("Token has expired")) {
        return errorResponse(
          "OTP_EXPIRED",
          "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.",
          400,
        );
      }
      if (error.message?.includes("invalid") || error.message?.includes("Invalid")) {
        return errorResponse(
          "INVALID_OTP",
          "Mã OTP không đúng. Vui lòng kiểm tra lại.",
          400,
        );
      }
      console.error("Lỗi xác thực OTP:", error);
      return errorResponse(
        "INTERNAL_ERROR",
        "Không thể xác thực OTP. Vui lòng thử lại sau.",
        500,
      );
    }

    if (!data.session || !data.user) {
      return errorResponse(
        "INTERNAL_ERROR",
        "Xác thực thành công nhưng không nhận được phiên đăng nhập.",
        500,
      );
    }

    // Fetch profile to get role and full_name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", data.user.id)
      .single();

    return successResponse({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: "bearer",
      user: {
        id: data.user.id,
        phone: data.user.phone,
        full_name: profile?.full_name ?? data.user.user_metadata?.full_name ?? "",
        role: profile?.role ?? "customer",
      },
    });
  } catch (err) {
    console.error("Lỗi hệ thống khi xác thực OTP:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});
