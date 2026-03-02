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
      className="dark min-h-screen bg-background text-foreground"
    >
      <main id="main-content">{children}</main>
    </div>
  );
}
