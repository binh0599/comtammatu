"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatPrice,
  formatElapsedTime,
  getOrderStatusLabel,
} from "@comtammatu/shared";

interface Order {
  id: number;
  order_number: string;
  status: string;
  type: string;
  total: number;
  created_at: string;
  table_id: number | null;
  tables: {
    number: number;
    zone_id: number;
    branch_zones: { name: string } | null;
  } | null;
  order_items: {
    id: number;
    quantity: number;
    menu_items: { name: string } | null;
  }[];
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  confirmed: "outline",
  preparing: "outline",
  ready: "default",
  served: "default",
  completed: "default",
  cancelled: "destructive",
};

const filterOptions = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang xử lý" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

export function OrdersList({
  initialOrders,
}: {
  initialOrders: Order[];
}) {
  const [filter, setFilter] = useState("all");

  const filteredOrders = initialOrders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "active") {
      return !["completed", "cancelled"].includes(order.status);
    }
    return order.status === filter;
  });

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {filterOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Orders */}
      <div className="space-y-2">
        {filteredOrders.map((order) => {
          const itemCount = order.order_items.reduce(
            (sum, i) => sum + i.quantity,
            0
          );

          return (
            <Link
              key={order.id}
              href={`/pos/order/${order.id}`}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
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
                    <span>
                      {order.type === "takeaway"
                        ? "Mang đi"
                        : order.type === "delivery"
                          ? "Giao hàng"
                          : "Tại quán"}
                    </span>
                  )}
                  <span className="mx-1">·</span>
                  <span>{itemCount} món</span>
                  <span className="mx-1">·</span>
                  <span>{formatElapsedTime(order.created_at)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPrice(order.total)}</p>
              </div>
              <ChevronRight className="text-muted-foreground h-5 w-5 shrink-0" />
            </Link>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="text-muted-foreground py-12 text-center text-sm">
            Không có đơn hàng nào
          </div>
        )}
      </div>
    </div>
  );
}
