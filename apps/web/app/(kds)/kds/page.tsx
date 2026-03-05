import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = {
  title: "Chọn Bếp KDS - Cơm tấm Má Tư",
  description: "Chọn bếp để bắt đầu",
};

export default async function KdsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id")
    .eq("id", user.id)
    .single();

  if (!profile?.branch_id) redirect("/login");

  const { data: stations } = await supabase
    .from("kds_stations")
    .select("id, name, is_active")
    .eq("branch_id", profile.branch_id)
    .eq("is_active", true)
    .order("name");

  // If only one station, redirect directly
  if (stations && stations.length === 1 && stations[0]) {
    redirect(`/kds/${stations[0].id}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="absolute right-6 top-6 flex items-center gap-3">
        <Link
          href="/kds/printer"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Cài đặt máy in
        </Link>
        <LogoutButton className="text-muted-foreground hover:text-destructive" />
      </div>
      <h1 className="mb-8 text-3xl font-bold">Chọn bếp</h1>

      {!stations || stations.length === 0 ? (
        <p className="text-muted-foreground">
          Không có bếp KDS nào được kích hoạt cho chi nhánh này
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => (
            <Link
              key={station.id}
              href={`/kds/${station.id}`}
              aria-label={`Mở KDS ${station.name}`}
              className="flex min-h-[120px] min-w-[200px] items-center justify-center rounded-xl border-2 border-border bg-card p-8 text-center text-xl font-bold transition-colors hover:border-primary hover:bg-accent active:scale-95"
            >
              {station.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
