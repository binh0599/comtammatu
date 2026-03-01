import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { POS_ROLES } from "@comtammatu/shared";
import { BottomNav } from "@/components/pos/bottom-nav";
import { Toaster } from "@/components/ui/sonner";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, branch_id, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const role = profile.role as (typeof POS_ROLES)[number];

  // Only POS roles can access
  if (!POS_ROLES.includes(role)) {
    redirect("/login");
  }

  return (
    <div data-route-group="pos" className="bg-background min-h-screen pb-16">
      {children}
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  );
}
