import type { Metadata } from "next";
import { createSupabaseServer } from "@comtammatu/database";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  formatPrice,
  formatDateTime,
  getOrderStatusLabel,
} from "@comtammatu/shared";

export const metadata: Metadata = {
  title: "Chi tiết đơn hàng - Cơm tấm Má Tư",
};

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = await params;
  const id = Number(orderId);
  if (Number.isNaN(id) || id <= 0) notFound();

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Look up customer
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", user.email ?? "")
    .single();

  if (!customer) {
    redirect("/customer");
  }

  // Fetch order with items, scoped to customer
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, type, subtotal, tax, service_charge, discount_total, total, notes, created_at, order_items(id, quantity, unit_price, item_total, menu_items(name))",
    )
    .eq("id", id)
    .eq("customer_id", customer.id)
    .single();

  if (!order) notFound();

  const isNewOrder = order.status === "confirmed";

  return (
    <div className="space-y-4">
      {/* Success banner for new orders */}
      {isNewOrder && (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200">
              Đặt hàng thành công!
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Đơn hàng của bạn đã được gửi đến bếp
            </p>
          </div>
        </div>
      )}

      {/* Order header */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">#{order.order_number}</h1>
            <Badge
              variant={
                order.status === "completed"
                  ? "default"
                  : order.status === "cancelled"
                    ? "destructive"
                    : "secondary"
              }
            >
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {formatDateTime(order.created_at)}
          </p>
          <p className="text-sm">
            {order.type === "dine_in" ? "Tại quán" : "Mang đi"}
          </p>
          {order.notes && (
            <p className="text-muted-foreground text-sm">
              Ghi chú: {order.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Order items */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Chi tiết món</h2>
          <div className="space-y-2">
            {order.order_items.map(
              (item: {
                id: number;
                quantity: number;
                unit_price: number;
                item_total: number;
                menu_items: { name: string } | null;
              }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {item.menu_items?.name ?? "Món ăn"} x{item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatPrice(item.item_total)}
                  </span>
                </div>
              ),
            )}
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tạm tính</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Thuế</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phí dịch vụ</span>
              <span>{formatPrice(order.service_charge)}</span>
            </div>
            {order.discount_total > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá</span>
                <span>-{formatPrice(order.discount_total)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Tổng cộng</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/customer/menu" className="flex-1">
          <Button variant="outline" className="w-full">
            Tiếp tục đặt món
          </Button>
        </Link>
        <Link href="/customer/orders" className="flex-1">
          <Button variant="default" className="w-full">
            Xem đơn hàng
          </Button>
        </Link>
      </div>
    </div>
  );
}
