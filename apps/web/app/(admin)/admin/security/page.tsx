import { Header } from "@/components/admin/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSecurityEvents,
  getSecuritySummary,
  getAuditLogs,
  getAuditResourceTypes,
} from "./actions";
import { EventsTab } from "./events-tab";
import { AuditTab } from "./audit-tab";

export default async function SecurityPage() {
  const [events, summary, auditLogs, resourceTypes] = await Promise.all([
    getSecurityEvents(),
    getSecuritySummary(),
    getAuditLogs(),
    getAuditResourceTypes(),
  ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Bảo mật" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Tabs defaultValue="events" className="w-full">
          <TabsList>
            <TabsTrigger value="events">Sự kiện bảo mật</TabsTrigger>
            <TabsTrigger value="audit">Nhật ký hoạt động</TabsTrigger>
          </TabsList>
          <TabsContent value="events">
            <EventsTab events={events} summary={summary} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditTab logs={auditLogs} resourceTypes={resourceTypes} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
