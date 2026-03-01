"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatPrice,
  formatDateTime,
  getOrderStatusLabel,
} from "@comtammatu/shared";
import { toast } from "sonner";
import {
  confirmOrder,
  updateOrderStatus,
} from "../../orders/actions";

interface OrderDetail {
  id: number;
  order_number: string;
  status: string;
  type: string;
  subtotal: number;
  tax: number;
  service_charge: number;
  discount_total: number;
  total: number;
  notes: string | null;
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
    unit_price: number;
    item_total: number;
    status: string;
    notes: string | null;
    menu_items: { name: string; image_url: string | null } | null;
    menu_item_variants: { name: string } | null;
  }[];
  payments: {
    id: number;
    amount: number;
    method: string;
    status: string;
    paid_at: string | null;
  }[];
  order_status_history: {
    id: number;
    from_status: string | null;
    to_status: string;
    created_at: string;
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

export function OrderDetailClient({ order }: { order: OrderDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmOrder(order.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã gửi bếp");
        router.refresh();
      }
    });
  }

  function handleStatusUpdate(newStatus: string) {
    startTransition(async () => {
      const result = await updateOrderStatus({
        order_id: order.id,
        status: newStatus,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Đã cập nhật: ${getOrderStatusLabel(newStatus)}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/pos/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{order.order_number}</h1>
          <p className="text-muted-foreground text-sm">
            {formatDateTime(order.created_at)}
            {order.tables && (
              <> · Bàn {order.tables.number}</>
            )}
          </p>
        </div>
        <Badge variant={statusVariant[order.status] ?? "secondary"}>
          {getOrderStatusLabel(order.status)}
        </Badge>
      </div>

      {/* Actions */}
      <div className="mb-4 flex gap-2">
        {order.status === "draft" && (
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 gap-2"
          >
            <Send className="h-4 w-4" />
            Gửi bếp
          </Button>
        )}
        {order.status === "ready" && (
          <Button
            onClick={() => handleStatusUpdate("served")}
            disabled={isPending}
            className="flex-1 gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Đã phục vụ
          </Button>
        )}
        {(order.status === "draft" || order.status === "confirmed") && (
          <Button
            variant="destructive"
            onClick={() => handleStatusUpdate("cancelled")}
            disabled={isPending}
          >
            Hủy đơn
          </Button>
        )}
      </div>

      {/* Items */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">
            Danh sách món ({order.order_items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {item.quantity}x{" "}
                    {item.menu_items?.name ?? "Món đã xóa"}
                    {item.menu_item_variants && (
                      <span className="text-muted-foreground text-sm">
                        {" "}
                        ({item.menu_item_variants.name})
                      </span>
                    )}
                  </p>
                  {item.notes && (
                    <p className="text-muted-foreground text-xs">
                      {item.notes}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {formatPrice(item.item_total)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Thuế</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between">
              <span>Phí dịch vụ</span>
              <span>{formatPrice(order.service_charge)}</span>
            </div>
            {order.discount_total > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá</span>
                <span>-{formatPrice(order.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Tổng cộng</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status History */}
      {order.order_status_history.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Lịch sử trạng thái</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.order_status_history
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .map((h) => (
                  <div
                    key={h.id}
                    className="text-muted-foreground flex items-center justify-between text-sm"
                  >
                    <span>
                      {h.from_status
                        ? `${getOrderStatusLabel(h.from_status)} → `
                        : ""}
                      {getOrderStatusLabel(h.to_status)}
                    </span>
                    <span className="text-xs">
                      {formatDateTime(h.created_at)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
