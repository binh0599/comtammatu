import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import Link from "next/link";

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
      <h1 className="mb-8 text-3xl font-bold">Chọn bếp</h1>

      {!stations || stations.length === 0 ? (
        <p className="text-gray-400">
          Không có bếp KDS nào được kích hoạt cho chi nhánh này
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => (
            <Link
              key={station.id}
              href={`/kds/${station.id}`}
              className="flex min-h-[120px] min-w-[200px] items-center justify-center rounded-xl border-2 border-gray-700 bg-gray-800 p-8 text-center text-xl font-bold transition-colors hover:border-green-500 hover:bg-gray-700 active:scale-95"
            >
              {station.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
