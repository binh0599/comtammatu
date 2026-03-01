"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SessionBar } from "./session-bar";
import { OrderQueue } from "./order-queue";
import { PaymentPanel } from "./payment-panel";

interface SessionInfo {
  id: number;
  opening_amount: number;
  opened_at: string;
  cashier_name: string;
  terminal_name: string;
}

interface QueueOrder {
  id: number;
  order_number: string;
  status: string;
  type: string;
  total: number;
  created_at: string;
  table_id: number | null;
  tables: { number: number } | null;
  order_items: {
    id: number;
    quantity: number;
    menu_items: { name: string } | null;
  }[];
}

export function CashierClient({
  session,
  orders,
}: {
  session: SessionInfo;
  orders: QueueOrder[];
}) {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<QueueOrder | null>(null);

  function handlePaymentComplete() {
    setSelectedOrder(null);
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col">
      <SessionBar session={session} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Order Queue (60%) */}
        <div className="w-3/5 border-r">
          <OrderQueue
            orders={orders}
            selectedOrderId={selectedOrder?.id ?? null}
            onSelectOrder={setSelectedOrder}
          />
        </div>

        {/* Right: Payment Panel (40%) */}
        <div className="w-2/5">
          <PaymentPanel
            order={selectedOrder}
            onPaymentComplete={handlePaymentComplete}
          />
        </div>
      </div>
    </div>
  );
}
