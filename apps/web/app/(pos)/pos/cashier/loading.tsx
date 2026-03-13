import { Card, CardContent, Skeleton } from "@comtammatu/ui";

export default function CashierLoading() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      {/* Session bar skeleton */}
      <div className="flex items-center gap-4 border-b px-4 py-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-32" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Order queue — 60% */}
        <div className="w-3/5 border-r">
          <div className="flex gap-2 border-b p-3">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="mb-1 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-5 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment panel — 40% */}
        <div className="w-2/5 p-4">
          <div className="flex h-full items-center justify-center">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}
