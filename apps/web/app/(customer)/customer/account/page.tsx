import type { Metadata } from "next";
import { createSupabaseServer } from "@comtammatu/database";
import { getCustomerProfile } from "../actions";
import { AccountClient } from "./account-client";

export const metadata: Metadata = {
  title: "Tài khoản - Com Tấm Mã Tú",
};

export default async function AccountPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AccountClient profile={null} userEmail={null} />;
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
