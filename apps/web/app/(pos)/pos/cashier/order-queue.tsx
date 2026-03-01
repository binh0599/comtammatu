"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatPrice,
  formatElapsedTime,
  getOrderStatusLabel,
} from "@comtammatu/shared";
import { cn } from "@/lib/utils";

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

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "outline",
  preparing: "outline",
  ready: "default",
  served: "default",
};

const filterTabs = [
  { value: "all", label: "Tất cả" },
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "ready", label: "Sẵn sàng" },
];

export function OrderQueue({
  orders,
  selectedOrderId,
  onSelectOrder,
}: {
  orders: QueueOrder[];
  selectedOrderId: number | null;
  onSelectOrder: (order: QueueOrder) => void;
}) {
  const [filter, setFilter] = useState("all");

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "unpaid") return order.status !== "completed";
    if (filter === "ready")
      return order.status === "ready" || order.status === "served";
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Filter tabs */}
      <div className="flex gap-2 border-b p-3">
        {filterTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={filter === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Order list */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {filteredOrders.map((order) => {
            const itemCount = order.order_items.reduce(
              (sum, i) => sum + i.quantity,
              0
            );
            const isSelected = selectedOrderId === order.id;

            return (
              <button
                key={order.id}
                type="button"
                onClick={() => onSelectOrder(order)}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-primary ring-1"
                    : "hover:bg-accent"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{order.order_number}</span>
                  <Badge
                    variant={statusVariant[order.status] ?? "secondary"}
                  >
                    {getOrderStatusLabel(order.status)}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {order.tables ? (
                    <span>Bàn {order.tables.number}</span>
                  ) : (
                    <span>Mang đi</span>
                  )}
                  <span className="mx-1">·</span>
                  <span>{itemCount} món</span>
                  <span className="mx-1">·</span>
                  <span>{formatElapsedTime(order.created_at)}</span>
                </div>
                <div className="mt-2 font-semibold">
                  {formatPrice(order.total)}
                </div>
              </button>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="text-muted-foreground py-12 text-center text-sm">
              Không có đơn hàng nào
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
