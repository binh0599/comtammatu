import { KdsTicketSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function KdsStationLoading() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <Skeleton className="h-6 w-40 bg-gray-700" />
        <Skeleton className="h-6 w-24 bg-gray-700" />
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
