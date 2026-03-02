import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";

export default async function AdminLayout({
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

  // Fetch profile for sidebar user info
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const role = data?.role ?? "customer";

  // Owner, manager, and hr can access admin
  if (!["owner", "manager", "hr"].includes(role)) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring">
        Bỏ qua đến nội dung chính
      </a>
      <AppSidebar
        user={{
          name: data?.full_name ?? user.email ?? "User",
          email: user.email ?? "",
          role,
        }}
      />
      <SidebarInset>
        <main id="main-content">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
