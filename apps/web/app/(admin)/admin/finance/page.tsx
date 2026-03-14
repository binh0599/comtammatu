import dynamic from "next/dynamic";
import { Header } from "@/components/admin/header";
import { getFinanceDashboardData } from "./actions";
import { FinanceKPICards } from "./finance-kpi-cards";
import { Skeleton } from "@comtammatu/ui";

function ChartFallback() {
  return <Skeleton className="h-[400px] w-full" />;
}

const FinanceDashboardClient = dynamic(
  () =>
    import("./finance-dashboard-client").then((m) => ({
      default: m.FinanceDashboardClient,
    })),
  { loading: ChartFallback },
);

export default async function FinanceDashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const data = await getFinanceDashboardData(monthStart, today);

  return (
    <>
      <Header breadcrumbs={[{ label: "Tài chính" }]} />
      <div className="flex flex-1 flex-col gap-6 p-4">
        {/* KPI Cards — server rendered for instant load */}
        <FinanceKPICards kpi={data.kpi} />

        {/* Interactive dashboard with charts & tables */}
        <FinanceDashboardClient
          initialData={data}
          initialStart={monthStart}
          initialEnd={today}
        />
      </div>
    </>
  );
}
