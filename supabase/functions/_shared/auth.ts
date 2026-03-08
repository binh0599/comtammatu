/**
 * Auth Helper — Xác thực JWT và lấy thông tin user.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { errorResponse } from "./response.ts";

export interface AuthUser {
  id: string;
  role: string;
  tenant_id: number;
  branch_id: number | null;
  full_name: string;
}

/**
 * Tạo Supabase client với service_role key (bỏ qua RLS).
 */
export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

/**
 * Tạo Supabase client với user JWT (tuân theo RLS).
 */
export function createUserClient(token: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  );
}

/**
 * Trích xuất JWT token từ Authorization header.
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

/**
 * Xác thực user từ request, trả về AuthUser hoặc error Response.
 * Nếu requiredRoles được chỉ định, kiểm tra role user có nằm trong danh sách không.
 */
export async function extractUser(
  req: Request,
  requiredRoles?: string[],
): Promise<[AuthUser, null] | [null, Response]> {
  const token = extractToken(req);
  if (!token) {
    return [
      null,
      errorResponse(
        "UNAUTHORIZED",
        "Vui lòng đăng nhập để tiếp tục.",
        401,
      ),
    ];
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return [
      null,
      errorResponse(
        "UNAUTHORIZED",
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        401,
      ),
    ];
  }

  // Lấy profile để biết role, tenant, branch
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, tenant_id, branch_id, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return [
      null,
      errorResponse(
        "UNAUTHORIZED",
        "Không tìm thấy thông tin tài khoản. Vui lòng liên hệ hỗ trợ.",
        401,
      ),
    ];
  }

  // Kiểm tra role
  if (requiredRoles && !requiredRoles.includes(profile.role)) {
    return [
      null,
      errorResponse(
        "FORBIDDEN",
        "Bạn không có quyền thực hiện thao tác này.",
        403,
      ),
    ];
  }

  const authUser: AuthUser = {
    id: user.id,
    role: profile.role,
    tenant_id: profile.tenant_id,
    branch_id: profile.branch_id,
    full_name: profile.full_name,
  };

  return [authUser, null];
}
