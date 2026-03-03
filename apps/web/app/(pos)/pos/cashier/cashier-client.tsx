"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SessionBar } from "./session-bar";
import { OrderQueue } from "./order-queue";
import { PaymentPanel } from "./payment-panel";
import { useCashierRealtime } from "./use-cashier-realtime";
import type { QueueOrder, SessionInfo } from "./types";

export function CashierClient({
  session,
  orders: initialOrders,
  branchId,
}: {
  session: SessionInfo;
  orders: QueueOrder[];
  branchId: number;
}) {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<QueueOrder | null>(null);
  const { orders } = useCashierRealtime(initialOrders, branchId);

  function handlePaymentComplete() {
    setSelectedOrder(null);
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col">
      <div aria-live="polite" aria-atomic="false">
        <SessionBar session={session} />
      </div>

      <div className="flex flex-1 overflow-hidden" aria-live="polite">
        {/* Left: Order Queue (60%) */}
        <div className="w-3/5 border-r">
          <OrderQueue
            orders={orders}
            selectedOrderId={selectedOrder?.id ?? null}
            onSelectOrder={setSelectedOrder}
          />
        </div>

        {/* Right: Payment Panel (40%) */}
        <div className="w-2/5" aria-live="polite" aria-atomic="true">
          <PaymentPanel
            order={selectedOrder}
            onPaymentComplete={handlePaymentComplete}
          />
        </div>
      </div>
    </div>
  );
}
