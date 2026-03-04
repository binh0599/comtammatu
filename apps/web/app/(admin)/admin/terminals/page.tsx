import { Header } from "@/components/admin/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone } from "lucide-react";
import { getTerminals, getBranches, getPendingDevices } from "./actions";
import { TerminalsTable } from "./terminals-table";
import { DevicesTable } from "./devices-table";
import { createSupabaseServer } from "@comtammatu/database";

export default async function TerminalsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user!.id)
    .single();

  const [terminals, branches, devices] = await Promise.all([
    getTerminals(),
    getBranches(),
    getPendingDevices(),
  ]);

  const pendingCount = (devices ?? []).filter(
    (d: { status: string }) => d.status === "pending",
  ).length;

  return (
    <>
      <Header breadcrumbs={[{ label: "Thiết bị" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="devices" className="w-full">
          <TabsList>
            <TabsTrigger value="devices" className="gap-2">
              <Smartphone className="size-4" />
              Thiết bị đăng nhập
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-medium text-white">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="terminals" className="gap-2">
              <Monitor className="size-4" />
              Thiết bị POS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices">
            <DevicesTable
              initialDevices={devices ?? []}
              tenantId={profile?.tenant_id ?? 0}
            />
          </TabsContent>

          <TabsContent value="terminals">
            <TerminalsTable terminals={terminals} branches={branches} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
