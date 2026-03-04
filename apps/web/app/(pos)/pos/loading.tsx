import { Skeleton } from "@/components/ui/skeleton";

export default function PosHomeLoading() {
  return (
    <div className="p-4">
      <div className="mb-4">
        <Skeleton className="mb-1 h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="space-y-6">
        {/* Takeaway section */}
        <div>
          <Skeleton className="mb-3 h-4 w-20" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            <Skeleton className="h-[72px] rounded-lg" />
          </div>
        </div>
        {/* Zone sections */}
        {Array.from({ length: 2 }).map((_, z) => (
          <div key={z}>
            <Skeleton className="mb-3 h-4 w-24" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
