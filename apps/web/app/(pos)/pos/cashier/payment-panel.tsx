"use client";

import { useState, useEffect, useTransition, useRef } from "react";
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
import { Tag, X, Banknote, QrCode, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import {
  formatPrice,
  getOrderStatusLabel,
} from "@comtammatu/shared";
import {
  processPayment,
  applyVoucherToOrder,
  removeVoucherFromOrder,
  createMomoPayment,
  checkPaymentStatus,
} from "./actions";

interface SelectedOrder {
  id: number;
  order_number: string;
  status: string;
  type: string;
  subtotal: number;
  discount_total: number;
  total: number;
  table_id: number | null;
  tables: { number: number } | null;
  order_items: {
    id: number;
    quantity: number;
    menu_items: { name: string } | null;
  }[];
  order_discounts: {
    id: number;
    type: string;
    value: number;
    voucher_id: number | null;
    vouchers: { code: string } | null;
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
  const [voucherCode, setVoucherCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isVoucherPending, startVoucherTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "momo" | null>(null);
  const [momoState, setMomoState] = useState<{
    qrUrl: string;
    paymentId: number;
    status: string;
  } | null>(null);
  const [isMomoPending, startMomoTransition] = useTransition();
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOrderIdRef = useRef<number | undefined>(undefined);

  // Reset state when order changes (via ref comparison, not useEffect)
  const currentOrderId = order?.id;
  if (currentOrderId !== prevOrderIdRef.current) {
    prevOrderIdRef.current = currentOrderId;
    if (paymentMethod !== null) setPaymentMethod(null);
    if (momoState !== null) setMomoState(null);
    if (amountTendered !== "") setAmountTendered("");
  }

  // Poll Momo payment status
  useEffect(() => {
    if (!momoState || momoState.status !== "pending") {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      const result = await checkPaymentStatus(momoState.paymentId);
      if (result.error) return;

      if (result.status === "completed") {
        setMomoState((prev) =>
          prev ? { ...prev, status: "completed" } : null,
        );
        toast.success("Thanh toán Momo thành công!");
        onPaymentComplete();
      } else if (result.status === "failed") {
        setMomoState((prev) =>
          prev ? { ...prev, status: "failed" } : null,
        );
        toast.error("Thanh toán Momo thất bại");
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [momoState, onPaymentComplete]);

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground text-center">
          Chọn đơn hàng từ danh sách bên trái để thanh toán
        </p>
      </div>
    );
  }

  const voucherDiscount = order.order_discounts?.find(
    (d) => d.type === "voucher",
  );

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
          `Thanh toán thành công. Tiền thừa: ${formatPrice(result.change ?? 0)}`,
        );
        setAmountTendered("");
        setVoucherCode("");
        setPaymentMethod(null);
        onPaymentComplete();
      }
    });
  }

  function handleMomoPayment() {
    startMomoTransition(async () => {
      const result = await createMomoPayment(order!.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setMomoState({
        qrUrl: result.qrCodeUrl!,
        paymentId: result.paymentId!,
        status: "pending",
      });
    });
  }

  function handleApplyVoucher() {
    if (!voucherCode.trim()) {
      toast.error("Vui lòng nhập mã voucher");
      return;
    }

    startVoucherTransition(async () => {
      const result = await applyVoucherToOrder({
        order_id: order!.id,
        voucher_code: voucherCode.trim(),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Áp dụng voucher thành công! Giảm ${formatPrice(result.discount_amount ?? 0)}`,
        );
        setVoucherCode("");
        onPaymentComplete(); // Refresh to get updated totals
      }
    });
  }

  function handleRemoveVoucher() {
    startVoucherTransition(async () => {
      const result = await removeVoucherFromOrder(order!.id);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã xóa voucher");
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
            {order.tables ? `Bàn ${order.tables.number}` : "Mang đi"}
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

      {/* Voucher Section */}
      {canPay && (
        <div className="mb-3">
          {voucherDiscount ? (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {voucherDiscount.vouchers?.code ?? "Voucher"}
                </span>
                <Badge variant="secondary" className="text-xs">
                  -{formatPrice(voucherDiscount.value)}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                onClick={handleRemoveVoucher}
                disabled={isVoucherPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Nhập mã voucher"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyVoucher()}
                className="text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyVoucher}
                disabled={isVoucherPending || !voucherCode.trim()}
              >
                {isVoucherPending ? "..." : "Áp dụng"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Total Breakdown */}
      <div className="mb-4 rounded-lg bg-primary/5 p-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tạm tính</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount_total > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Giảm giá</span>
              <span>-{formatPrice(order.discount_total)}</span>
            </div>
          )}
        </div>
        <div className="mt-2 border-t pt-2 text-center">
          <p className="text-muted-foreground text-xs">Tổng thanh toán</p>
          <p className="text-primary text-3xl font-bold">
            {formatPrice(order.total)}
          </p>
        </div>
      </div>

      {canPay && (
        <>
          {/* Payment Method Selector */}
          {paymentMethod === null && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex h-20 flex-col items-center gap-2"
                onClick={() => setPaymentMethod("cash")}
              >
                <Banknote className="h-8 w-8" />
                <span className="text-sm font-medium">Tiền mặt</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex h-20 flex-col items-center gap-2 border-pink-200 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
                onClick={() => {
                  setPaymentMethod("momo");
                  handleMomoPayment();
                }}
              >
                <QrCode className="h-8 w-8" />
                <span className="text-sm font-medium">Momo QR</span>
              </Button>
            </div>
          )}

          {/* Back button when method is selected */}
          {paymentMethod !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 w-fit"
              onClick={() => {
                setPaymentMethod(null);
                setMomoState(null);
                setAmountTendered("");
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Đổi phương thức
            </Button>
          )}

          {/* Cash Payment Flow */}
          {paymentMethod === "cash" && (
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

          {/* Momo QR Payment Flow */}
          {paymentMethod === "momo" && (
            <div className="flex flex-col items-center gap-4">
              {isMomoPending && !momoState && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                  <p className="text-muted-foreground text-sm">
                    Đang tạo mã QR...
                  </p>
                </div>
              )}

              {momoState && momoState.status === "pending" && (
                <>
                  <div className="rounded-lg border-2 border-pink-200 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={momoState.qrUrl}
                      alt="Momo QR"
                      className="mx-auto h-48 w-48"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-pink-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">
                      Đang chờ thanh toán...
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs text-center">
                    Quét mã QR bằng ứng dụng Momo để thanh toán
                  </p>
                </>
              )}

              {momoState && momoState.status === "completed" && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="text-lg font-bold text-green-700">
                    Thanh toán thành công!
                  </p>
                </div>
              )}

              {momoState && momoState.status === "failed" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-sm text-red-600">
                    Thanh toán thất bại. Vui lòng thử lại.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMomoState(null);
                      handleMomoPayment();
                    }}
                    className="border-pink-200 text-pink-600"
                  >
                    Thử lại
                  </Button>
                </div>
              )}
            </div>
          )}
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
