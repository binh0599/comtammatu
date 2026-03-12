import { createSupabaseServer } from "@comtammatu/database";

/**
 * Shared auth + customer lookup for privacy API routes.
 * Returns authenticated user and their customer record.
 */
export async function getAuthenticatedCustomer() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id, tenant_id, full_name, email")
    .eq("email", user.email)
    .single();

  if (!customer) {
    return { error: "Customer not found", status: 404 } as const;
  }

  return { supabase, user, customer } as const;
}
