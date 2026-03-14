import { Header } from "@/components/admin/header";
import { LayoutGrid, List, CalendarClock } from "lucide-react";
import { getTables, getBranches, getZones, getTableSummary } from "./actions";
import { FloorPlanTab } from "./floor-plan-tab";
import { TableListTab } from "./table-list-tab";
import { ReservationTab } from "./reservation-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@comtammatu/ui";

export default async function TablesPage() {
  const [tables, branches, zones, summary] = await Promise.all([
    getTables(),
    getBranches(),
    getZones(),
    getTableSummary(),
  ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Bàn" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="floor-plan" className="w-full">
          <TabsList>
            <TabsTrigger value="floor-plan" className="gap-2">
              <LayoutGrid className="size-4" />
              Sơ đồ
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="size-4" />
              Danh sách
            </TabsTrigger>
            <TabsTrigger value="reservations" className="gap-2">
              <CalendarClock className="size-4" />
              Đặt bàn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="floor-plan">
            <FloorPlanTab tables={tables} branches={branches} summary={summary} />
          </TabsContent>

          <TabsContent value="list">
            <TableListTab tables={tables} branches={branches} zones={zones} />
          </TabsContent>

          <TabsContent value="reservations">
            <ReservationTab tables={tables} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
