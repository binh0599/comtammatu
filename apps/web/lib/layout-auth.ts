import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";

/**
 * Shared layout auth guard. Verifies user is logged in and has a profile
 * with a role in the allowed list. Redirects to /login if not.
 *
 * @param allowedRoles - Array of roles that can access this layout
 * @param select - Profile columns to fetch (always includes "role")
 * @returns { user, profile, supabase } for layout use
 */
export async function requireLayoutAuth<
  T extends Record<string, unknown>,
>(
  allowedRoles: readonly string[],
  select: string,
): Promise<{
  user: { id: string; email?: string };
  profile: T & { role: string };
}> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(select)
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const role = (profile as unknown as Record<string, unknown>).role as string;

  if (!allowedRoles.includes(role)) {
    redirect("/login");
  }

  return {
    user: { id: user.id, email: user.email ?? undefined },
    profile: profile as unknown as T & { role: string },
  };
}
