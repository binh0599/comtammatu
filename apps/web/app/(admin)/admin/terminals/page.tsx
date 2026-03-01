import { Header } from "@/components/admin/header";
import { getTerminals, getBranches } from "./actions";
import { TerminalsTable } from "./terminals-table";

export default async function TerminalsPage() {
  const [terminals, branches] = await Promise.all([
    getTerminals(),
    getBranches(),
  ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Thiết bị POS" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <TerminalsTable terminals={terminals} branches={branches} />
      </div>
    </>
  );
}
