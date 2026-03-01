import { Header } from "@/components/admin/header";
import { getKdsStations, getBranchesAndCategories } from "./actions";
import { StationsTable } from "./stations-table";

export default async function KdsStationsPage() {
  const [stations, { branches, categories }] = await Promise.all([
    getKdsStations(),
    getBranchesAndCategories(),
  ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Bếp KDS" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <StationsTable
          stations={stations}
          branches={branches}
          categories={categories}
        />
      </div>
    </>
  );
}
