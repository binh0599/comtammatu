import { createSupabaseServer } from "@comtammatu/database";
import { NextResponse } from "next/server";
import { apiLimiter } from "@comtammatu/security";
import { headers } from "next/headers";

/**
 * Shared auth helper for Mobile App API routes.
 * Authenticates via Supabase Bearer token (Authorization header).
 * Resolves the customer record from the authenticated user.
 *
 * @returns Customer context or JSON error response
 */
export async function getMobileCustomer() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Chưa đăng nhập. Vui lòng đăng nhập lại." },
        { status: 401 }
      ),
    } as const;
  }

  // Resolve customer record via user_id (primary) or email (fallback)
  let customer = null;

  const { data: byUserId } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (byUserId) {
    customer = byUserId;
  } else if (user.email) {
    const { data: byEmail } = await supabase
      .from("customers")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();
    customer = byEmail;
  }

  if (!customer) {
    return {
      error: NextResponse.json({ error: "Không tìm thấy hồ sơ khách hàng." }, { status: 404 }),
    } as const;
  }

  return { supabase, user, customer } as const;
}

/**
 * Rate limit a mobile API request by customer ID or IP.
 * Returns a 429 response if rate limited.
 */
export async function checkMobileRateLimit(key: string): Promise<NextResponse | null> {
  const { success } = await apiLimiter.limit(`mobile:${key}`);
  if (!success) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429 }
    );
  }
  return null;
}

/**
 * Get client IP from request headers.
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Standard JSON success response.
 */
export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

/**
 * Standard JSON error response.
 */
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
