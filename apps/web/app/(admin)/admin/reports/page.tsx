import { Header } from "@/components/admin/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getReportData } from "./actions";
import { ReportsClient } from "./reports-client";
import { AnalyticsTab } from "./analytics-tab";

export default async function ReportsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const data = await getReportData(monthStart, today);

  return (
    <>
      <Header breadcrumbs={[{ label: "Bao cao" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="reports" className="w-full">
          <TabsList>
            <TabsTrigger value="reports">Bao cao</TabsTrigger>
            <TabsTrigger value="analytics">Phan tich chi nhanh</TabsTrigger>
          </TabsList>
          <TabsContent value="reports">
            <ReportsClient
              initialData={data}
              initialStart={monthStart}
              initialEnd={today}
            />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
