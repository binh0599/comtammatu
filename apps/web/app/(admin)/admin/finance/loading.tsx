import { Header } from "@/components/admin/header";
import { Card, CardContent, CardHeader, Skeleton } from "@comtammatu/ui";

export default function FinanceLoading() {
  return (
    <>
      <Header breadcrumbs={[{ label: "Tài chính" }]} />
      <div className="flex flex-1 flex-col gap-6 p-4">
        {/* KPI Cards Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-l-4 border-l-muted">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="size-9 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls Skeleton */}
        <div className="flex gap-3">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Chart Skeleton */}
        <Skeleton className="h-[400px] w-full rounded-lg" />

        {/* Two Column Skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px] rounded-lg" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
      </div>
    </>
  );
}
