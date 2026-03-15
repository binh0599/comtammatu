import { AppSidebar } from "@/components/admin/app-sidebar";
import { requireLayoutAuth } from "@/lib/layout-auth";
import { AdminLayoutToolbar } from "@/components/admin/admin-layout-toolbar";
import { SidebarInset, SidebarProvider } from "@comtammatu/ui";

const ADMIN_ALLOWED_ROLES = ["owner", "manager", "hr"] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireLayoutAuth<{ full_name: string | null }>(
    ADMIN_ALLOWED_ROLES,
    "full_name, role"
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
        <AdminLayoutToolbar />
        <div id="main-content" className="flex flex-1 flex-col animate-page-in">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
