import { getOrders } from "./actions";
import { OrdersList } from "./orders-list";

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Đơn hàng</h1>
        <p className="text-muted-foreground text-sm">
          Danh sách đơn hàng chi nhánh
        </p>
      </div>
      <OrdersList initialOrders={orders} />
    </div>
  );
}
