"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SessionBar } from "./session-bar";
import { OrderQueue } from "./order-queue";
import { PaymentPanel } from "./payment-panel";
import { useCashierRealtime } from "./use-cashier-realtime";
import { usePrinterForTerminal } from "@/hooks/use-printer-config";
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
  const { config: printerConfig } = usePrinterForTerminal(session.terminal_id);
  const [selectedOrder, setSelectedOrder] = useState<QueueOrder | null>(null);
  const { orders } = useCashierRealtime(initialOrders, branchId);

  function handlePaymentComplete() {
    setSelectedOrder(null);
    router.refresh();
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div>
        <SessionBar session={session} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left: Order Queue (60%) */}
        <div className="min-h-0 flex-1 border-b md:w-3/5 md:border-b-0 md:border-r">
          <OrderQueue
            orders={orders}
            selectedOrderId={selectedOrder?.id ?? null}
            onSelectOrder={setSelectedOrder}
          />
        </div>

        {/* Right: Payment Panel (40%) */}
        <div className="min-h-0 flex-1 md:w-2/5 md:flex-none">
          <PaymentPanel
            order={selectedOrder}
            onPaymentComplete={handlePaymentComplete}
            cashierName={session.cashier_name}
            printerConfig={printerConfig}
          />
        </div>
      </div>
    </div>
  );
}
