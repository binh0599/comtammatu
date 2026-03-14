import dynamic from "next/dynamic";
import { Header } from "@/components/admin/header";
import { getReportData } from "./actions";
import { ReportsClient } from "./reports-client";
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@comtammatu/ui";

const AnalyticsTab = dynamic(
  () => import("./analytics-tab").then((m) => ({ default: m.AnalyticsTab })),
  { loading: () => <Skeleton className="h-[400px] w-full" /> }
);

const KdsTab = dynamic(() => import("./kds-tab").then((m) => ({ default: m.KdsTab })), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

export default async function ReportsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
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
            <TabsTrigger value="kds">Hiệu suất bếp</TabsTrigger>
          </TabsList>
          <TabsContent value="reports">
            <ReportsClient initialData={data} initialStart={monthStart} initialEnd={today} />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
          <TabsContent value="kds">
            <KdsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
