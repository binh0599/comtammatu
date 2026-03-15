import { Header } from "@/components/admin/header";
import {
  getSecurityEvents,
  getSecuritySummary,
  getAuditLogs,
  getAuditResourceTypes,
} from "./actions";
import { EventsTab } from "./events-tab";
import { AuditTab } from "./audit-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@comtammatu/ui";

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
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="events" className="w-full">
          <TabsList>
            <TabsTrigger value="events">Sự kiện bảo mật</TabsTrigger>
            <TabsTrigger value="audit">Nhật ký hoạt động</TabsTrigger>
          </TabsList>
          <TabsContent value="events">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- security_events/audit_logs have dynamic JSON columns (metadata, new_value) */}
            <EventsTab events={events as any} summary={summary} />
          </TabsContent>
          <TabsContent value="audit">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- security_events/audit_logs have dynamic JSON columns (metadata, new_value) */}
            <AuditTab logs={auditLogs as any} resourceTypes={resourceTypes} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
