import dynamic from "next/dynamic";
import { Header } from "@/components/admin/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getReportData } from "./actions";
import { ReportsClient } from "./reports-client";

const AnalyticsTab = dynamic(
  () => import("./analytics-tab").then((m) => ({ default: m.AnalyticsTab })),
  { loading: () => <Skeleton className="h-[400px] w-full" /> },
);

export default async function ReportsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const data = await getReportData(monthStart, today);

  return (
    <>
      <Header breadcrumbs={[{ label: "Báo cáo" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="reports" className="w-full">
          <TabsList>
            <TabsTrigger value="reports">Báo cáo</TabsTrigger>
            <TabsTrigger value="analytics">Phân tích chi nhánh</TabsTrigger>
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
