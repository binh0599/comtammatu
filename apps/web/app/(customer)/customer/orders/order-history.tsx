"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, ChevronDown, ChevronUp, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  formatPrice,
  formatDateTime,
  getOrderStatusLabel,
} from "@comtammatu/shared";

interface OrderItem {
  id: number;
  quantity: number;
  unit_price: number;
  item_total: number;
  menu_items: { name: string } | null;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  type: string;
  subtotal: number;
  tax: number;
  service_charge: number;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderHistoryProps {
  orders: Order[];
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "cancelled":
      return "destructive";
    case "preparing":
    case "confirmed":
      return "secondary";
    default:
      return "outline";
  }
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = order.status === "completed";

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">#{order.order_number}</span>
              <Badge variant={getStatusVariant(order.status)}>
                {getOrderStatusLabel(order.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatDateTime(order.created_at)}
            </p>
          </div>
          <span className="text-primary font-semibold">
            {formatPrice(order.total)}
          </span>
        </div>

        {/* Expand/collapse items */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground mt-3 flex w-full items-center gap-1 text-sm"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {order.order_items.length} mon
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            <Separator />
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {item.menu_items?.name ?? "Mon an"} x{item.quantity}
                </span>
                <span className="text-muted-foreground">
                  {formatPrice(item.item_total)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Feedback link for completed orders */}
        {isCompleted && (
          <div className="mt-3">
            <Link href={`/customer/feedback/${order.id}`}>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Star className="h-4 w-4" />
                Danh gia
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OrderHistory({ orders }: OrderHistoryProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <ClipboardList className="text-muted-foreground h-12 w-12" />
        <p className="text-muted-foreground text-sm">Chua co don hang nao</p>
        <Link href="/customer/menu">
          <Button variant="outline" size="sm">
            Xem thuc don
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Don hang cua ban</h1>
      <div className="grid gap-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
