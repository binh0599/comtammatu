/**
 * Idempotency Helper
 * Kiểm tra và lưu idempotency key để tránh xử lý trùng lặp.
 * Sử dụng bảng idempotency_keys (cần tạo migration).
 */

import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { errorResponse } from "./response.ts";

/**
 * Kiểm tra X-Idempotency-Key header.
 * Trả về [key, null] nếu hợp lệ và chưa xử lý,
 * hoặc [null, Response] nếu thiếu key hoặc đã xử lý rồi.
 */
export async function checkIdempotency(
  req: Request,
  adminClient: SupabaseClient,
): Promise<[string, null] | [null, Response]> {
  const key = req.headers.get("x-idempotency-key");

  if (!key) {
    return [
      null,
      errorResponse(
        "IDEMPOTENCY_KEY_REQUIRED",
        "Thiếu header X-Idempotency-Key. Vui lòng gửi kèm UUID.",
        400,
      ),
    ];
  }

  // Kiểm tra key đã tồn tại chưa
  const { data: existing, error } = await adminClient
    .from("idempotency_keys")
    .select("id, response_body, response_status")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error("Lỗi kiểm tra idempotency key:", error);
    // Không block request nếu không truy vấn được bảng idempotency
    return [key, null];
  }

  if (existing) {
    // Nếu đã có response_body, trả lại response cũ
    if (existing.response_body) {
      return [
        null,
        new Response(JSON.stringify(existing.response_body), {
          status: existing.response_status || 200,
          headers: { "Content-Type": "application/json" },
        }),
      ];
    }

    // Key tồn tại nhưng chưa có response — đang xử lý
    return [
      null,
      errorResponse(
        "DUPLICATE_REQUEST",
        "Yêu cầu này đang được xử lý. Vui lòng đợi.",
        409,
      ),
    ];
  }

  // Tạo record mới với status processing
  const { error: insertError } = await adminClient
    .from("idempotency_keys")
    .insert({
      key,
      status: "processing",
      created_at: new Date().toISOString(),
    });

  if (insertError) {
    // Có thể bị race condition — key đã tồn tại
    if (insertError.code === "23505") {
      return [
        null,
        errorResponse(
          "DUPLICATE_REQUEST",
          "Yêu cầu này đã được xử lý trước đó.",
          409,
        ),
      ];
    }
    console.error("Lỗi lưu idempotency key:", insertError);
  }

  return [key, null];
}

/**
 * Lưu response vào idempotency key record sau khi xử lý thành công.
 */
export async function saveIdempotencyResponse(
  adminClient: SupabaseClient,
  key: string,
  responseBody: unknown,
  responseStatus: number,
): Promise<void> {
  const { error } = await adminClient
    .from("idempotency_keys")
    .update({
      status: "completed",
      response_body: responseBody,
      response_status: responseStatus,
    })
    .eq("key", key);

  if (error) {
    console.error("Lỗi cập nhật idempotency response:", error);
  }
}
