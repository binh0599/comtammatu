import { Header } from "@/components/admin/header";
import { getPayments, getBranches } from "./actions";
import { PaymentsTab } from "./payments-tab";

export default async function PaymentsPage() {
  const [payments, branches] = await Promise.all([
    getPayments(),
    getBranches(),
  ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Thanh toán" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <PaymentsTab payments={payments} branches={branches} />
      </div>
    </>
  );
}
