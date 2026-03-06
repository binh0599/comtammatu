import { PendingOrdersClient } from "./pending-orders-client";

export default function PendingOrdersPage() {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Don cho dong bo</h1>
        <p className="text-muted-foreground text-sm">
          Cac don hang duoc tao khi mat ket noi mang
        </p>
      </div>
      <PendingOrdersClient />
    </div>
  );
}
