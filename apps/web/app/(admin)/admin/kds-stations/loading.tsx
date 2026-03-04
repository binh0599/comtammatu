import { Header } from "@/components/admin/header";
import { TableSkeleton } from "@/components/skeletons";

export default function KdsStationsLoading() {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TableSkeleton rows={6} />
      </div>
    </>
  );
}
