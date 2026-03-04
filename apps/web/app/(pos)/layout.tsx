import { POS_ROLES, DEVICE_CHECK_ROLES } from "@comtammatu/shared";
import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/pos/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { RealtimeNotifications } from "@/components/pos/realtime-notifications";
import { requireLayoutAuth } from "@/lib/layout-auth";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireLayoutAuth<{
    branch_id: number | null;
    tenant_id: number | null;
  }>(POS_ROLES, "role, branch_id, tenant_id");

  // Staff roles must have an approved device to access POS
  if (
    DEVICE_CHECK_ROLES.includes(
      profile.role as (typeof DEVICE_CHECK_ROLES)[number],
    ) &&
    profile.tenant_id
  ) {
    const supabase = await createSupabaseServer();
    const { data: approvedDevice } = await supabase
      .from("registered_devices")
      .select("id")
      .eq("registered_by", user.id)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();

    if (!approvedDevice) {
      redirect("/login");
    }
  }

  return (
    <div data-route-group="pos" className="bg-background min-h-screen pb-16">
      {profile.branch_id && (
        <RealtimeNotifications branchId={profile.branch_id} />
      )}
      <main id="main-content">{children}</main>
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  );
}
