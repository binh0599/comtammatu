import { Skeleton } from "@/components/ui/skeleton";

export default function KdsHomeLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-64 mb-6" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6"
          >
            <Skeleton className="h-6 w-32 mb-3" />
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
