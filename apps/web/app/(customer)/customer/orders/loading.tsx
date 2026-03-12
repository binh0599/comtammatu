import { OrderCardSkeleton } from "@/components/skeletons";

export default function OrdersLoading() {
  return (
    <div className="p-4 space-y-3">
      <OrderCardSkeleton />
      <OrderCardSkeleton />
      <OrderCardSkeleton />
    </div>
  );
}
