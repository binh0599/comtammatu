import { createSupabaseServer } from "@comtammatu/database";

/**
 * Shared auth + customer lookup for privacy API routes.
 * Returns authenticated user and their customer record.
 *
 * Supports both:
 * - Cookie-based auth (web browser)
 * - Bearer token auth (Mobile App via Authorization header)
 *
 * Customer lookup uses `user_id` (preferred) with `email` fallback
 * for backward compatibility with legacy customer records.
 */
export async function getAuthenticatedCustomer() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  // Prefer user_id lookup (mobile app creates customers with user_id)
  // Fall back to email lookup (legacy web PWA customers)
  let customer = null;

  const { data: byUserId } = await supabase
    .from("customers")
    .select("id, tenant_id, full_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (byUserId) {
    customer = byUserId;
  } else {
    const { data: byEmail } = await supabase
      .from("customers")
      .select("id, tenant_id, full_name, email")
      .eq("email", user.email)
      .maybeSingle();

    customer = byEmail;
  }

  if (!customer) {
    return { error: "Customer not found", status: 404 } as const;
  }

  return { supabase, user, customer } as const;
}
