import { POS_ROLES, DEVICE_CHECK_ROLES } from "@comtammatu/shared";
import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/pos/bottom-nav";
import { RealtimeNotifications } from "@/components/pos/realtime-notifications";
import { requireLayoutAuth } from "@/lib/layout-auth";
import { ServiceWorkerRegister } from "./pos/components/sw-register";
import { OfflineIndicator } from "./pos/components/offline-indicator";
import { Toaster } from "@comtammatu/ui";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireLayoutAuth<{
    branch_id: number | null;
    tenant_id: number | null;
  }>(POS_ROLES, "role, branch_id, tenant_id");

  // Staff roles must have an approved device to access POS.
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
    <div data-route-group="pos" className="bg-background min-h-screen pb-16">
      <ServiceWorkerRegister />
      {profile.branch_id && (
        <RealtimeNotifications branchId={profile.branch_id} />
      )}
      <div className="fixed top-2 right-2 z-50">
        <OfflineIndicator />
      </div>
      <main id="main-content" className="animate-page-in">{children}</main>
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  );
}
