import { Skeleton } from "@/components/ui/skeleton";

export default function KdsHomeLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 mb-2 bg-gray-700" />
      <Skeleton className="h-4 w-64 mb-6 bg-gray-700" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-700 bg-gray-800 p-6"
          >
            <Skeleton className="h-6 w-32 mb-3 bg-gray-700" />
            <Skeleton className="h-4 w-48 mb-2 bg-gray-700" />
            <Skeleton className="h-4 w-24 bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
