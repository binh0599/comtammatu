/**
 * Zod Validation Wrapper
 * Parse input bằng Zod schema, trả về errorResponse nếu validation fail.
 */

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { errorResponse } from "./response.ts";

export { z };

/**
 * Parse và validate request body bằng Zod schema.
 * Trả về [data, null] nếu hợp lệ, hoặc [null, Response] nếu không hợp lệ.
 */
export async function validateBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<[z.infer<T>, null] | [null, Response]> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return [
      null,
      errorResponse(
        "VALIDATION_ERROR",
        "Dữ liệu gửi lên không phải JSON hợp lệ.",
        400,
      ),
    ];
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return [
      null,
      errorResponse(
        "VALIDATION_ERROR",
        "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.",
        400,
        details,
      ),
    ];
  }

  return [result.data, null];
}

/**
 * Parse và validate query params bằng Zod schema.
 */
export function validateQuery<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): [z.infer<T>, null] | [null, Response] {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return [
      null,
      errorResponse(
        "VALIDATION_ERROR",
        "Tham số truy vấn không hợp lệ. Vui lòng kiểm tra lại.",
        400,
        details,
      ),
    ];
  }

  return [result.data, null];
}
