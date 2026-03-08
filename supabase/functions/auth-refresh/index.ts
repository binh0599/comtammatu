import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { validateBody, z } from "../_shared/validate.ts";
import { createAdminClient } from "../_shared/auth.ts";

const RefreshSchema = z.object({
  refresh_token: z
    .string()
    .min(1, "Refresh token không được để trống."),
});

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "POST") {
    return errorResponse("VALIDATION_ERROR", "Chỉ hỗ trợ phương thức POST.", 405);
  }

  const [body, validationError] = await validateBody(req, RefreshSchema);
  if (validationError) return validationError;

  const { refresh_token } = body;

  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      if (
        error.message?.includes("Invalid Refresh Token") ||
        error.message?.includes("token is expired") ||
        error.message?.includes("invalid")
      ) {
        return errorResponse(
          "INVALID_REFRESH_TOKEN",
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          401,
        );
      }
      console.error("Lỗi làm mới token:", error);
      return errorResponse(
        "INTERNAL_ERROR",
        "Không thể làm mới phiên đăng nhập. Vui lòng thử lại.",
        500,
      );
    }

    if (!data.session) {
      return errorResponse(
        "INTERNAL_ERROR",
        "Không nhận được phiên mới. Vui lòng đăng nhập lại.",
        500,
      );
    }

    return successResponse({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    });
  } catch (err) {
    console.error("Lỗi hệ thống khi làm mới token:", err);
    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      500,
    );
  }
});
