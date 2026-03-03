import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { requireLayoutAuth } from "@/lib/layout-auth";

const ADMIN_ALLOWED_ROLES = ["owner", "manager", "hr"] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireLayoutAuth<{ full_name: string | null }>(
    ADMIN_ALLOWED_ROLES,
    "full_name, role",
  );

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: profile.full_name ?? user.email ?? "User",
          email: user.email ?? "",
          role: profile.role,
        }}
      />
      <SidebarInset>
        <main id="main-content">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
