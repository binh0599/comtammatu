import { redirect } from "next/navigation";
import { Header } from "@/components/admin/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone, CookingPot } from "lucide-react";
import { getTerminals, getBranches, getPendingDevices } from "./actions";
import { getKdsStations, getBranchesAndCategories } from "../kds-stations/actions";
import { TerminalsTable } from "./terminals-table";
import { DevicesTable } from "./devices-table";
import { StationsTable } from "../kds-stations/stations-table";
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

  const [terminals, branches, devices, kdsStations, branchesAndCategories] = await Promise.all([
    getTerminals(),
    getBranches(),
    getPendingDevices(),
    getKdsStations(),
    getBranchesAndCategories(),
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
            <TabsTrigger value="kds" className="gap-2">
              <CookingPot className="size-4" />
              Bếp KDS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices">
            <DevicesTable
              initialDevices={devices ?? []}
              tenantId={profile.tenant_id}
            />
          </TabsContent>

          <TabsContent value="terminals">
            <TerminalsTable terminals={terminals} branches={branches} />
          </TabsContent>

          <TabsContent value="kds">
            <StationsTable
              stations={kdsStations}
              branches={branchesAndCategories.branches}
              categories={branchesAndCategories.categories}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
