import { KdsTicketSkeleton } from "@/components/skeletons";
import { Skeleton } from "@comtammatu/ui";

export default function KdsStationLoading() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <KdsTicketSkeleton />
          <KdsTicketSkeleton />
          <KdsTicketSkeleton />
          <KdsTicketSkeleton />
          <KdsTicketSkeleton />
          <KdsTicketSkeleton />
        </div>
      </div>
    </div>
  );
}
