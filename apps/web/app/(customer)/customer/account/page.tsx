import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { getCustomerProfile } from "../actions";
import { AccountClient } from "./account-client";

export default async function AccountPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profile: Awaited<ReturnType<typeof getCustomerProfile>> | null = null;
  try {
    profile = await getCustomerProfile();
  } catch {
    // Customer record may not exist
  }

  return (
    <AccountClient
      profile={profile}
      userEmail={user.email ?? null}
    />
  );
}
