import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { validateBody, z } from "../_shared/validate.ts";
import { createAdminClient } from "../_shared/auth.ts";

const SignupSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Số điện thoại phải theo định dạng E.164 (VD: +84901234567)."),
  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
  full_name: z
    .string()
    .min(1, "Họ tên không được để trống.")
    .max(100, "Họ tên không được dài quá 100 ký tự."),
  referral_code: z
    .string()
    .optional(),
});

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "POST") {
    return errorResponse("VALIDATION_ERROR", "Chỉ hỗ trợ phương thức POST.", 405);
  }

  // Validate input
  const [body, validationError] = await validateBody(req, SignupSchema);
  if (validationError) return validationError;

  const { phone, password, full_name, referral_code } = body;

  try {
    const adminClient = createAdminClient();

    // Sign up via Supabase Auth
    const { data, error } = await adminClient.auth.signUp({
      phone,
      password,
      options: {
        data: {
          full_name,
          referral_code: referral_code ?? null,
        },
      },
    });

    if (error) {
      // Handle known auth errors
      if (error.message?.includes("already registered") || error.message?.includes("already been registered")) {
        return errorResponse(
          "DUPLICATE_PHONE",
          "Số điện thoại này đã được đăng ký. Vui lòng đăng nhập hoặc dùng số khác.",
          409,
        );
      }
      console.error("Lỗi đăng ký:", error);
      return errorResponse(
        "INTERNAL_ERROR",
        "Không thể đăng ký tài khoản. Vui lòng thử lại sau.",
        500,
      );
    }

    if (!data.user) {
      return errorResponse(
        "INTERNAL_ERROR",
        "Không thể tạo tài khoản. Vui lòng thử lại sau.",
        500,
      );
    }

    // Create profile record
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: data.user.id,
        tenant_id: 1, // Single-tenant for mobile app
        full_name,
        role: "customer",
      });

    if (profileError) {
      console.error("Lỗi tạo profile:", profileError);
      // Profile creation failed but auth user was created — still return success
      // Profile will be created on first login via a fallback mechanism
    }

    // Create customer record linked to auth user
    const { error: customerError } = await adminClient
      .from("customers")
      .insert({
        tenant_id: 1,
        phone,
        full_name,
        auth_user_id: data.user.id,
        source: referral_code ? "referral" : "mobile_app",
        first_visit: new Date().toISOString().split("T")[0],
      });

    if (customerError) {
      console.error("Lỗi tạo customer:", customerError);
      // Non-blocking — customer record can be created later
    }

    return successResponse(
      {
        user_id: data.user.id,
        phone,
        confirmation_sent: true,
      },
      undefined,
      201,
    );
  } catch (err) {
    console.error("Lỗi hệ thống khi đăng ký:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});
