"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatPrice,
  getOrderStatusLabel,
} from "@comtammatu/shared";
import { processPayment } from "./actions";

interface SelectedOrder {
  id: number;
  order_number: string;
  status: string;
  type: string;
  total: number;
  table_id: number | null;
  tables: { number: number } | null;
  order_items: {
    id: number;
    quantity: number;
    menu_items: { name: string } | null;
  }[];
}

export function PaymentPanel({
  order,
  onPaymentComplete,
}: {
  order: SelectedOrder | null;
  onPaymentComplete: () => void;
}) {
  const [amountTendered, setAmountTendered] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground text-center">
          Chọn đơn hàng từ danh sách bên trái để thanh toán
        </p>
      </div>
    );
  }

  const change =
    amountTendered && Number(amountTendered) >= order.total
      ? Number(amountTendered) - order.total
      : null;

  const quickAmounts = [
    order.total,
    Math.ceil(order.total / 10000) * 10000,
    Math.ceil(order.total / 50000) * 50000,
    Math.ceil(order.total / 100000) * 100000,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= order.total);

  function handlePayment() {
    if (!amountTendered || Number(amountTendered) < order!.total) {
      toast.error("Số tiền không đủ");
      return;
    }

    startTransition(async () => {
      const result = await processPayment({
        order_id: order!.id,
        method: "cash",
        amount_tendered: Number(amountTendered),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Thanh toán thành công. Tiền thừa: ${formatPrice(result.change ?? 0)}`
        );
        setAmountTendered("");
        onPaymentComplete();
      }
    });
  }

  const canPay =
    order.status === "ready" ||
    order.status === "served" ||
    order.status === "confirmed" ||
    order.status === "preparing";

  return (
    <div className="flex h-full flex-col p-4">
      {/* Order Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">{order.order_number}</h3>
          <p className="text-muted-foreground text-sm">
            {order.tables
              ? `Bàn ${order.tables.number}`
              : "Mang đi"}
          </p>
        </div>
        <Badge>{getOrderStatusLabel(order.status)}</Badge>
      </div>

      {/* Items */}
      <Card className="mb-4 flex-1 overflow-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Chi tiết đơn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between text-sm"
              >
                <span>
                  {item.quantity}x{" "}
                  {item.menu_items?.name ?? "Món đã xóa"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Total */}
      <div className="mb-4 rounded-lg bg-primary/5 p-4 text-center">
        <p className="text-muted-foreground text-sm">Tổng thanh toán</p>
        <p className="text-primary text-3xl font-bold">
          {formatPrice(order.total)}
        </p>
      </div>

      {canPay && (
        <>
          {/* Quick amount buttons */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            {quickAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setAmountTendered(String(amount))}
                className={
                  Number(amountTendered) === amount
                    ? "border-primary"
                    : ""
                }
              >
                {formatPrice(amount)}
              </Button>
            ))}
          </div>

          {/* Manual input */}
          <div className="mb-3 grid gap-2">
            <Label htmlFor="amount">Tiền khách đưa (VNĐ)</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              step={1000}
              value={amountTendered}
              onChange={(e) => setAmountTendered(e.target.value)}
              placeholder="Nhập số tiền"
              className="text-lg"
            />
          </div>

          {/* Change display */}
          {change !== null && (
            <div className="mb-3 rounded-lg bg-green-50 p-3 text-center">
              <p className="text-sm text-green-700">Tiền thừa</p>
              <p className="text-2xl font-bold text-green-700">
                {formatPrice(change)}
              </p>
            </div>
          )}

          {/* Pay button */}
          <Button
            size="lg"
            className="w-full text-lg"
            onClick={handlePayment}
            disabled={
              isPending ||
              !amountTendered ||
              Number(amountTendered) < order.total
            }
          >
            {isPending
              ? "Đang xử lý..."
              : `Thanh toán ${formatPrice(order.total)}`}
          </Button>
        </>
      )}

      {!canPay && (
        <div className="rounded-lg bg-yellow-50 p-3 text-center text-sm text-yellow-700">
          Đơn hàng chưa sẵn sàng thanh toán
        </div>
      )}
    </div>
  );
}
