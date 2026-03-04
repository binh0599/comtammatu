import { Header } from "@/components/admin/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TabsSkeleton, TableSkeleton } from "@/components/skeletons";

export default function CrmLoading() {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-6 p-4">
        {/* Stats cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-2 h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>

        <TabsSkeleton tabs={4} />
        <TableSkeleton rows={8} />
      </div>
    </>
  );
}
