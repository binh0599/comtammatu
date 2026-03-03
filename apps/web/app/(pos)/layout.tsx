import { POS_ROLES } from "@comtammatu/shared";
import { BottomNav } from "@/components/pos/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { RealtimeNotifications } from "@/components/pos/realtime-notifications";
import { requireLayoutAuth } from "@/lib/layout-auth";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireLayoutAuth<{ branch_id: number | null; tenant_id: number | null }>(
    POS_ROLES,
    "role, branch_id, tenant_id",
  );

  return (
    <div data-route-group="pos" className="bg-background min-h-screen pb-16">
      {profile.branch_id && <RealtimeNotifications branchId={profile.branch_id} />}
      <main id="main-content">{children}</main>
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  );
}
