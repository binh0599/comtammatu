import { Header } from "@/components/admin/header";
import { TabsSkeleton, TableSkeleton } from "@/components/skeletons";

export default function HrLoading() {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <TabsSkeleton tabs={5} />
        <TableSkeleton rows={8} />
      </div>
    </>
  );
}
