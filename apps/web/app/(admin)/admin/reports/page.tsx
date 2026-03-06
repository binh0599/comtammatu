import { Header } from "@/components/admin/header";
import { getReportData } from "./actions";
import { ReportsClient } from "./reports-client";

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
        <ReportsClient
          initialData={data}
          initialStart={monthStart}
          initialEnd={today}
        />
      </div>
    </>
  );
}
