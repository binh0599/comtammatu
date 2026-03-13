import { KDS_ROLES, DEVICE_CHECK_ROLES } from "@comtammatu/shared";
import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { RealtimeNotifications } from "@/components/pos/realtime-notifications";
import { requireLayoutAuth } from "@/lib/layout-auth";
import { Toaster } from "@comtammatu/ui";

export default async function KdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireLayoutAuth<{
    branch_id: number | null;
    tenant_id: number | null;
  }>(KDS_ROLES, "role, branch_id, tenant_id");

  // Staff roles must have an approved device to access KDS.
  // Fail-closed: if tenant_id is missing, redirect to login (incomplete profile).
  if (
    DEVICE_CHECK_ROLES.includes(
      profile.role as (typeof DEVICE_CHECK_ROLES)[number],
    )
  ) {
    if (!profile.tenant_id) {
      redirect("/login");
    }

    const supabase = await createSupabaseServer();
    const { data: approvedDevice, error: deviceError } = await supabase
      .from("registered_devices")
      .select("id")
      .eq("registered_by", user.id)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();

    if (deviceError) {
      // DB/RLS error — don't mask as "no device"; throw to render error boundary
      throw new Error(`Device check failed: ${deviceError.message}`);
    }

    if (!approvedDevice) {
      redirect("/login");
    }
  }

  return (
    <div
      data-route-group="kds"
      className="min-h-screen bg-background text-foreground"
    >
      {profile.branch_id && (
        <RealtimeNotifications branchId={profile.branch_id} />
      )}
      <main id="main-content">{children}</main>
      <Toaster position="top-center" />
    </div>
  );
}
