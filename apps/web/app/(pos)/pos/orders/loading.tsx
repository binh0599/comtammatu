import { Skeleton } from "@/components/ui/skeleton";
import { OrderCardSkeleton } from "@/components/skeletons";

export default function OrdersLoading() {
  return (
    <div className="p-4">
      <div className="mb-4">
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="space-y-3">
        <OrderCardSkeleton />
        <OrderCardSkeleton />
        <OrderCardSkeleton />
      </div>
    </div>
  );
}
