import { Header } from "@/components/admin/header";
import { StatCardSkeleton, TableSkeleton } from "@/components/skeletons";

export default function CampaignsLoading() {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <TableSkeleton rows={6} />
      </div>
    </>
  );
}
