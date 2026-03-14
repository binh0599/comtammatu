import { PendingOrdersClient } from "./pending-orders-client";

export default function PendingOrdersPage() {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Đơn chờ đồng bộ</h1>
        <p className="text-muted-foreground text-sm">Các đơn hàng được tạo khi mất kết nối mạng</p>
      </div>
      <PendingOrdersClient />
    </div>
  );
}
