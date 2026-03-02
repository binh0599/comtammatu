/**
 * Server-side authentication and authorization helpers.
 * Used by Server Actions to validate user identity and entity ownership.
 *
 * IMPORTANT: Only import this in server-side code (Server Actions, RSC, API routes).
 * Never import in "use client" files.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ActionError } from "../utils/errors";
import type { StaffRole } from "../constants";

/**
 * Get authenticated user profile with optional role check.
 * Throws ActionError if not authenticated or insufficient role.
 */
export async function getAuthenticatedProfile(
  supabase: SupabaseClient,
  requiredRoles?: readonly StaffRole[],
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ActionError("Bạn phải đăng nhập", "UNAUTHORIZED", 401);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, tenant_id, branch_id, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new ActionError("Hồ sơ không tìm thấy", "NOT_FOUND", 404);
  }

  if (requiredRoles && !requiredRoles.includes(profile.role as StaffRole)) {
    throw new ActionError(
      "Bạn không có quyền truy cập chức năng này",
      "UNAUTHORIZED",
      403,
    );
  }

  return { user, profile };
}

/**
 * Verify an entity belongs to the user's branch.
 * Throws ActionError if entity not found or belongs to a different branch.
 *
 * @param supabase - Supabase client instance
 * @param table - Database table name (e.g., "orders", "tables")
 * @param entityId - ID of the entity to verify
 * @param userBranchId - The user's branch_id from their profile
 */
export async function verifyBranchOwnership(
  supabase: SupabaseClient,
  table: string,
  entityId: number,
  userBranchId: number,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select("branch_id")
    .eq("id", entityId)
    .single();

  if (error || !data) {
    throw new ActionError(
      `Không tìm thấy dữ liệu trong ${table}`,
      "NOT_FOUND",
      404,
    );
  }

  if (data.branch_id !== userBranchId) {
    throw new ActionError(
      "Dữ liệu không thuộc chi nhánh của bạn",
      "UNAUTHORIZED",
      403,
    );
  }
}

/**
 * Verify an entity belongs to the user's tenant.
 * Throws ActionError if entity not found or belongs to a different tenant.
 *
 * @param supabase - Supabase client instance
 * @param table - Database table name (e.g., "menu_items", "vouchers")
 * @param entityId - ID of the entity to verify
 * @param userTenantId - The user's tenant_id from their profile
 */
export async function verifyTenantOwnership(
  supabase: SupabaseClient,
  table: string,
  entityId: number,
  userTenantId: number,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select("tenant_id")
    .eq("id", entityId)
    .single();

  if (error || !data) {
    throw new ActionError(
      `Không tìm thấy dữ liệu trong ${table}`,
      "NOT_FOUND",
      404,
    );
  }

  if (data.tenant_id !== userTenantId) {
    throw new ActionError(
      "Dữ liệu không thuộc tổ chức của bạn",
      "UNAUTHORIZED",
      403,
    );
  }
}
