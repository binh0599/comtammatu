import { Header } from "@/components/admin/header";
import { getAdminOrders, getBranches } from "./actions";
import { OrdersHistory } from "./orders-history";

export default async function AdminOrdersPage() {
  const [orders, branches] = await Promise.all([getAdminOrders(), getBranches()]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Đơn hàng" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <OrdersHistory orders={orders} branches={branches} />
      </div>
    </>
  );
}
