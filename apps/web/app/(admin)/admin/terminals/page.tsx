import { redirect } from "next/navigation";
import { Header } from "@/components/admin/header";
import { getPendingDevices } from "./actions";
import { DevicesTable } from "./devices-table";
import { createSupabaseServer } from "@comtammatu/database";

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

  if (!profile?.tenant_id) redirect("/login");

  const devices = await getPendingDevices();

  return (
    <>
      <Header breadcrumbs={[{ label: "Thiết bị" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <DevicesTable
          initialDevices={devices ?? []}
          tenantId={profile.tenant_id}
        />
      </div>
    </>
  );
}
