import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { KDS_ROLES } from "@comtammatu/shared";

export default async function KdsLayout({
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const role = profile.role as (typeof KDS_ROLES)[number];

  if (!KDS_ROLES.includes(role)) {
    redirect("/login");
  }

  return (
    <div
      data-route-group="kds"
      className="min-h-screen bg-gray-900 text-white"
    >
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring">
        Bỏ qua đến nội dung chính
      </a>
      <main id="main-content">{children}</main>
    </div>
  );
}
