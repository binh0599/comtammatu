import { KDS_ROLES } from "@comtammatu/shared";
import { RealtimeNotifications } from "@/components/pos/realtime-notifications";
import { Toaster } from "@/components/ui/sonner";
import { requireLayoutAuth } from "@/lib/layout-auth";

export default async function KdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireLayoutAuth<{ branch_id: number | null }>(
    KDS_ROLES,
    "role, branch_id",
  );

  return (
    <div
      data-route-group="kds"
      className="min-h-screen bg-background text-foreground"
    >
      {profile.branch_id && <RealtimeNotifications branchId={profile.branch_id} />}
      <main id="main-content">{children}</main>
      <Toaster position="top-center" />
    </div>
  );
}
