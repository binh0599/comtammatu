/**
 * Response Envelope Helpers
 * Chuẩn hoá format response cho toàn bộ Edge Functions.
 */

import { corsHeaders } from "./cors.ts";

interface Meta {
  cursor?: string;
  has_next?: boolean;
  limit?: number;
  [key: string]: unknown;
}

interface ErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Trả về response thành công.
 */
export function successResponse(
  data: unknown,
  meta?: Meta,
  status = 200,
): Response {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) {
    body.meta = meta;
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Trả về response lỗi.
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  const error: ErrorDetail = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
