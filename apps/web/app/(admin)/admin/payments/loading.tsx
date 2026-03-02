import { Header } from "@/components/admin/header";
import { TableSkeleton } from "@/components/skeletons";

export default function PaymentsLoading() {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <TableSkeleton rows={10} />
      </div>
    </>
  );
}
