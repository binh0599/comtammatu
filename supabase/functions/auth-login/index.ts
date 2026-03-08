import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { validateBody, z } from "../_shared/validate.ts";
import { createAdminClient } from "../_shared/auth.ts";

const LoginSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Số điện thoại không hợp lệ."),
  password: z
    .string()
    .min(1, "Mật khẩu không được để trống."),
});

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "POST") {
    return errorResponse("VALIDATION_ERROR", "Chỉ hỗ trợ phương thức POST.", 405);
  }

  const [body, validationError] = await validateBody(req, LoginSchema);
  if (validationError) return validationError;

  const { phone, password } = body;

  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.auth.signInWithPassword({
      phone,
      password,
    });

    if (error) {
      if (error.message?.includes("Invalid login credentials")) {
        return errorResponse(
          "INVALID_CREDENTIALS",
          "Số điện thoại hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.",
          401,
        );
      }
      if (error.message?.includes("Email not confirmed") || error.message?.includes("Phone not confirmed")) {
        return errorResponse(
          "PHONE_NOT_VERIFIED",
          "Số điện thoại chưa được xác thực. Vui lòng xác thực OTP trước.",
          403,
        );
      }
      console.error("Lỗi đăng nhập:", error);
      return errorResponse(
        "INTERNAL_ERROR",
        "Không thể đăng nhập. Vui lòng thử lại sau.",
        500,
      );
    }

    if (!data.session || !data.user) {
      return errorResponse(
        "INTERNAL_ERROR",
        "Đăng nhập thành công nhưng không nhận được phiên.",
        500,
      );
    }

    // Fetch profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", data.user.id)
      .single();

    // Update last_visit on customer record
    await adminClient
      .from("customers")
      .update({
        last_visit: new Date().toISOString().split("T")[0],
        total_visits: undefined, // Will use SQL increment instead
      })
      .eq("auth_user_id", data.user.id);

    // Increment total_visits via RPC or raw update
    await adminClient.rpc("increment_customer_visits", {
      p_auth_user_id: data.user.id,
    }).then(() => {}).catch(() => {
      // Non-critical — visits counter can be out of sync
    });

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
    console.error("Lỗi hệ thống khi đăng nhập:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});
