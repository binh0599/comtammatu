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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;
type CreateSupabaseServerFn = () => Promise<SupabaseClient>;

/** Injected factory — set via `configureActionContext()` */
let _createSupabaseServer: CreateSupabaseServerFn | null = null;

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
            "getActionContext: must call configureActionContext(createSupabaseServer) first",
        );
    }

    const supabase = await _createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new ActionError("Bạn phải đăng nhập", "UNAUTHORIZED", 401);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, role")
        .eq("id", user.id)
        .single();

    const tenantId = profile?.tenant_id;
    if (!tenantId) {
        throw new ActionError(
            "Tài khoản chưa được gán tenant",
            "UNAUTHORIZED",
            403,
        );
    }

    return {
        supabase,
        userId: user.id,
        tenantId,
        userRole: profile?.role ?? "customer",
    };
}
