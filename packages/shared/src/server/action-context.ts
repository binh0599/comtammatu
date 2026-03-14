/**
 * Shared authentication context for Server Actions.
 * Replaces the duplicated `getTenantId()` helper found across action files.
 *
 * **Setup**: Call `configureActionContext()` once during app bootstrap
 * to inject the `createSupabaseServer` factory.
 *
 * IMPORTANT: Only import in server-side code (Server Actions, RSC, API routes).
 */

import { ActionError } from "../utils/errors";
import type { StaffRole } from "../constants";
import { MSG } from "../messages";

import type { SupabaseClient as BaseSupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@comtammatu/database/types";

/**
 * Typed SupabaseClient with the project's Database schema.
 * Uses `import type` from @comtammatu/database (no runtime dep, no circular dep).
 */
export type SupabaseClient = BaseSupabaseClient<Database>;
type CreateSupabaseServerFn = () => Promise<SupabaseClient>;

/** Injected factory — set via `configureActionContext()` */
let _createSupabaseServer: CreateSupabaseServerFn | null = null;

/**
 * Shared helper: get authenticated Supabase user or throw.
 * Single source of truth for the "Bạn phải đăng nhập" check.
 */
async function _ensureAuthUser(supabase: SupabaseClient): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ActionError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401);
  }

  return user;
}

/**
 * Configure the action context with a Supabase server client factory.
 * Call this once in your app's server-side bootstrap (e.g., a layout or
 * a shared module imported by all action files).
 *
 * @example
 * ```ts
 * import { createSupabaseServer } from "@comtammatu/database";
 * import { configureActionContext } from "@comtammatu/shared";
 * configureActionContext(createSupabaseServer);
 * ```
 */
export function configureActionContext(factory: CreateSupabaseServerFn): void {
  _createSupabaseServer = factory;
}

/**
 * The context object returned by `getActionContext()`.
 */
export interface ActionContext {
  supabase: SupabaseClient;
  userId: string;
  tenantId: number;
  userRole: string;
  branchId: number | null;
}

/**
 * Get the authenticated user context for a Server Action.
 * Validates that the user is logged in and has a valid tenant.
 *
 * @throws ActionError("UNAUTHORIZED") if not authenticated or no tenant
 * @throws Error if `configureActionContext()` was not called
 */
export async function getActionContext(): Promise<ActionContext> {
  if (!_createSupabaseServer) {
    throw new Error(
      "getActionContext: must call configureActionContext(createSupabaseServer) first"
    );
  }

  const supabase = await _createSupabaseServer();
  const user = await _ensureAuthUser(supabase);

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role, branch_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.tenant_id;
  if (!tenantId) {
    throw new ActionError(MSG.NO_TENANT, "UNAUTHORIZED", 403);
  }

  return {
    supabase,
    userId: user.id,
    tenantId,
    userRole: profile?.role ?? "customer",
    branchId: profile?.branch_id ?? null,
  };
}

/**
 * Assert that the user has a branch assigned and return the branch ID.
 *
 * @throws ActionError("VALIDATION_ERROR") if no branch assigned
 */
export function requireBranch(ctx: ActionContext): number {
  if (ctx.branchId == null) {
    throw new ActionError(MSG.NO_BRANCH, "VALIDATION_ERROR", 400);
  }
  return ctx.branchId;
}

/**
 * Get action context with role enforcement for admin pages.
 * Replaces the duplicated `getAdminContext()` / `getAdminProfile()` helpers
 * found in orders, payments, terminals, and kds-stations action files.
 *
 * @param requiredRoles - Array of allowed roles (e.g., ADMIN_ROLES, KDS_ROLES)
 * @throws ActionError("UNAUTHORIZED") if user's role is not in the required list
 */
export async function getAdminContext(requiredRoles: readonly StaffRole[]): Promise<ActionContext> {
  const ctx = await getActionContext();
  if (!requiredRoles.includes(ctx.userRole as StaffRole)) {
    throw new ActionError(MSG.NO_PERMISSION, "UNAUTHORIZED", 403);
  }
  return ctx;
}

/**
 * Fetch all branches for a tenant. Replaces the duplicated `getBranches()`
 * pattern found in 5+ admin action files.
 */
export async function getBranchesForTenant(
  supabase: SupabaseClient,
  tenantId: number
): Promise<Array<{ id: number; name: string }>> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

/**
 * Fetch all branch IDs for a tenant. Useful for queries that need
 * to scope by branch_id IN (...).
 */
export async function getBranchIdsForTenant(
  supabase: SupabaseClient,
  tenantId: number
): Promise<number[]> {
  const { data, error } = await supabase.from("branches").select("id").eq("tenant_id", tenantId);

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  if (!data || data.length === 0) return [];
  return data.map((b: { id: number }) => b.id);
}

/**
 * Context for KDS actions — authenticated user with branch and KDS role.
 */
export interface KdsContext {
  supabase: SupabaseClient;
  userId: string;
  profile: { tenant_id: number; branch_id: number; role: string };
}

/**
 * Get KDS action context. Validates that the user has a KDS-compatible role
 * and a branch assignment. Replaces the duplicated `getKdsProfile()` helper.
 *
 * @param requiredRoles - Array of allowed roles (e.g., KDS_ROLES)
 */
export async function getKdsBranchContext(
  requiredRoles: readonly StaffRole[]
): Promise<KdsContext> {
  const ctx = await getActionContext();
  if (!requiredRoles.includes(ctx.userRole as StaffRole)) {
    throw new ActionError(MSG.NO_KDS_PERMISSION, "UNAUTHORIZED", 403);
  }
  if (ctx.branchId == null) {
    throw new ActionError(MSG.NO_BRANCH, "UNAUTHORIZED", 403);
  }
  return {
    supabase: ctx.supabase,
    userId: ctx.userId,
    profile: {
      tenant_id: ctx.tenantId,
      branch_id: ctx.branchId,
      role: ctx.userRole,
    },
  };
}

/**
 * Context for customer-facing actions — authenticated user linked to a customer record.
 */
export interface CustomerContext {
  supabase: SupabaseClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customer: any; // customers row
}

/**
 * Get the authenticated customer context for customer-facing Server Actions.
 * Resolves the auth user → profiles → customers link.
 *
 * @throws ActionError("UNAUTHORIZED") if not authenticated or no customer record
 */
export async function getCustomerContext(): Promise<CustomerContext> {
  if (!_createSupabaseServer) {
    throw new Error(
      "getCustomerContext: must call configureActionContext(createSupabaseServer) first"
    );
  }

  const supabase = await _createSupabaseServer();
  const user = await _ensureAuthUser(supabase);

  // Resolve customer record via profile user_id → customers.user_id
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !customer) {
    throw new ActionError("Không tìm thấy hồ sơ khách hàng", "UNAUTHORIZED", 403);
  }

  return { supabase, customer };
}

/**
 * Verify that an entity (accessed via a join through branches) belongs to the caller's tenant.
 * Works for tables like `pos_terminals` and `kds_stations` that have a `branch_id` FK
 * with the branch itself having `tenant_id`.
 *
 * @returns The entity data on success, or `{ error: string }` on failure
 */
export async function verifyEntityOwnership<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  entityId: number,
  tenantId: number,
  select: string = "id, is_active, branches!inner(tenant_id)"
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic table helper
  const { data, error } = await (supabase as any)
    .from(table)
    .select(select)
    .eq("id", entityId)
    .eq("branches.tenant_id", tenantId)
    .single();

  if (error || !data) {
    return { data: null, error: MSG.ENTITY_NOT_FOUND };
  }

  return { data: data as T, error: null };
}
