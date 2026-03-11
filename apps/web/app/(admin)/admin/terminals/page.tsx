import { redirect } from "next/navigation";
import { Header } from "@/components/admin/header";
import { createSupabaseServer } from "@comtammatu/database";
import { getDevices, getBranches } from "./actions";
import { DevicesTable } from "./devices-table";

export default async function TerminalsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const devices = await getDevices();

  return (
    <>
      <Header breadcrumbs={[{ label: "Thiết bị" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <DevicesTable
          initialDevices={devices ?? []}
          tenantId={profile?.tenant_id ?? 0}
        />
      </div>
    </>
  );
}
