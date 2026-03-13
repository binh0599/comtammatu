"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Tag, X, Banknote, QrCode, Loader2, CheckCircle2, ArrowLeft, Landmark, RefreshCw, AlertTriangle } from "lucide-react";
import {
  formatPrice,
  getOrderStatusLabel,
} from "@comtammatu/shared";
import { ORDER_STATUS_VARIANT } from "@/lib/ui-constants";
import { ReceiptPrinter } from "../components/receipt-printer";
import type { PrinterConfig } from "@/hooks/use-printer-config";
import {
  processPayment,
  applyVoucherToOrder,
  removeVoucherFromOrder,
  createMomoPayment,
  checkPaymentStatus,
  queryMomoPaymentStatus,
} from "./actions";
import {
  createTransferPayment,
  confirmTransferPayment,
} from "./transfer-actions";
import type { QueueOrder } from "./types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@comtammatu/ui";

export function PaymentPanel({
  order,
  onPaymentComplete,
  cashierName,
  printerConfig,
}: {
  order: QueueOrder | null;
  onPaymentComplete: () => void;
  cashierName?: string;
  printerConfig?: PrinterConfig | null;
}) {
  const [amountTendered, setAmountTendered] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isVoucherPending, startVoucherTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "momo" | "transfer" | null>(null);
  const [momoState, setMomoState] = useState<{
    qrUrl: string;
    paymentId: number;
    status: string;
  } | null>(null);
  const [transferState, setTransferState] = useState<{
    qrUrl: string;
    paymentId: number;
    bankName: string;
    accountNo: string;
    accountName: string;
    amount: number;
    addInfo: string;
    status: "pending" | "confirmed";
  } | null>(null);
  const [isTransferPending, startTransferTransition] = useTransition();
  const [referenceNo, setReferenceNo] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isMomoPending, startMomoTransition] = useTransition();
  const [isQueryPending, startQueryTransition] = useTransition();
  const [momoElapsed, setMomoElapsed] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const momoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOrderIdRef = useRef<number | undefined>(undefined);

  // Reset state when order changes (via ref comparison, not useEffect)
  const currentOrderId = order?.id;
  if (currentOrderId !== prevOrderIdRef.current) {
    prevOrderIdRef.current = currentOrderId;
    if (paymentMethod !== null) setPaymentMethod(null);
    if (momoState !== null) setMomoState(null);
    if (momoElapsed !== 0) setMomoElapsed(0);
    if (transferState !== null) setTransferState(null);
    if (amountTendered !== "") setAmountTendered("");
    if (referenceNo !== "") setReferenceNo("");
    if (showReceipt) setShowReceipt(false);
    if (paidAmount !== 0) setPaidAmount(0);
  }

  // Poll Momo payment status
  useEffect(() => {
    if (!momoState || momoState.status !== "pending") {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (momoTimerRef.current) {
        clearInterval(momoTimerRef.current);
        momoTimerRef.current = null;
      }
      return;
    }

    // Elapsed time counter (updates every second)
    setMomoElapsed(0);
    momoTimerRef.current = setInterval(() => {
      setMomoElapsed((prev) => prev + 1);
    }, 1000);

    pollIntervalRef.current = setInterval(async () => {
      const result = await checkPaymentStatus(momoState.paymentId);
      if (result.error) return;

      const data = result as { status: string; reference_no: string | null; paid_at: string | null };
      if (data.status === "completed") {
        setMomoState((prev) =>
          prev ? { ...prev, status: "completed" } : null,
        );
        toast.success("Thanh toán Momo thành công!");
        onPaymentComplete();
      } else if (data.status === "failed") {
        setMomoState((prev) =>
          prev ? { ...prev, status: "failed" } : null,
        );
        toast.error("Thanh toán Momo thất bại");
      } else if (data.status === "expired") {
        setMomoState((prev) =>
          prev ? { ...prev, status: "expired" } : null,
        );
        toast.error("Giao dịch Momo đã hết hạn");
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (momoTimerRef.current) {
        clearInterval(momoTimerRef.current);
        momoTimerRef.current = null;
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
        const data = result as { change: number };
        toast.success(
          `Thanh toán thành công. Tiền thừa: ${formatPrice(data.change ?? 0)}`,
        );
        setPaidAmount(Number(amountTendered));
        setAmountTendered("");
        setVoucherCode("");
        setPaymentMethod(null);
        setShowReceipt(true);
        // We do NOT call onPaymentComplete() immediately because we want to show the receipt first.
        // The user can close the receipt to continue, or we can auto-continue after print.
      }
    });
  }

  function handlePrintComplete() {
    setShowReceipt(false);
    onPaymentComplete();
  }

  function handleQueryMomo() {
    if (!momoState) return;
    startQueryTransition(async () => {
      const result = await queryMomoPaymentStatus(momoState.paymentId);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const data = result as { status: string; changed: boolean };
      if (data.status === "completed") {
        setMomoState((prev) => (prev ? { ...prev, status: "completed" } : null));
        toast.success("Thanh toán Momo thành công!");
        onPaymentComplete();
      } else if (data.status === "failed") {
        setMomoState((prev) => (prev ? { ...prev, status: "failed" } : null));
        toast.error("Thanh toán Momo thất bại");
      } else {
        toast.info("Vẫn đang chờ thanh toán...");
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

      const data = result as { qrCodeUrl: string; paymentId: number };
      setMomoState({
        qrUrl: data.qrCodeUrl,
        paymentId: data.paymentId,
        status: "pending",
      });
    });
  }

  function handleTransferPayment() {
    startTransferTransition(async () => {
      const result = await createTransferPayment(order!.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const data = result as {
        qrUrl: string;
        paymentId: number;
        bankName: string;
        accountNo: string;
        accountName: string;
        amount: number;
        addInfo: string;
      };
      setTransferState({
        ...data,
        status: "pending",
      });
    });
  }

  function handleConfirmTransfer() {
    if (!transferState) return;

    startTransferTransition(async () => {
      const result = await confirmTransferPayment({
        paymentId: transferState.paymentId,
        referenceNo: referenceNo || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setTransferState((prev) =>
        prev ? { ...prev, status: "confirmed" } : null,
      );
      toast.success("Xác nhận chuyển khoản thành công!");
      onPaymentComplete();
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
        const data = result as { discount_amount: number };
        toast.success(
          `Áp dụng voucher thành công! Giảm ${formatPrice(data.discount_amount ?? 0)}`,
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
        <div className="flex gap-2 items-center">
          {order.status === "completed" && (
            <ReceiptPrinter
              order={order}
              cashierName={cashierName}
              printerConfig={printerConfig}
              preferThermal={!!printerConfig?.auto_print}
            />
          )}
          <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? "secondary"}>{getOrderStatusLabel(order.status)}</Badge>
        </div>
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
                <span className="text-muted-foreground shrink-0">
                  {formatPrice(item.item_total)}
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
                <Tag className="size-4 text-green-600" aria-hidden="true" />
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
                className="size-8 p-0 text-red-500 hover:text-red-700"
                onClick={handleRemoveVoucher}
                disabled={isVoucherPending}
                aria-label="Xóa mã giảm giá"
              >
                <X className="size-4" aria-hidden="true" />
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
                aria-label="Mã voucher"
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
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex h-20 flex-col items-center gap-2"
                onClick={() => setPaymentMethod("cash")}
              >
                <Banknote className="size-8" aria-hidden="true" />
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
                <QrCode className="size-8" aria-hidden="true" />
                <span className="text-sm font-medium">Momo QR</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex h-20 flex-col items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                onClick={() => {
                  setPaymentMethod("transfer");
                  handleTransferPayment();
                }}
              >
                <Landmark className="h-8 w-8" />
                <span className="text-sm font-medium">Chuyển khoản</span>
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
                setTransferState(null);
                setAmountTendered("");
                setReferenceNo("");
              }}
            >
              <ArrowLeft className="mr-1 size-4" />
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
                <div className="flex flex-col items-center gap-2 py-6" role="status" aria-live="polite">
                  <Loader2 className="size-8 animate-spin text-pink-500" aria-hidden="true" />
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
                      alt="Mã QR Momo — quét để thanh toán"
                      className="mx-auto h-48 w-48"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-pink-600" role="status" aria-live="polite">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span className="text-sm font-medium">
                      Đang chờ thanh toán... ({Math.floor(momoElapsed / 60)}:{String(momoElapsed % 60).padStart(2, "0")})
                    </span>
                  </div>
                  {momoElapsed < 300 ? (
                    <p className="text-muted-foreground text-xs text-center">
                      Quét mã QR bằng ứng dụng Momo để thanh toán
                    </p>
                  ) : (
                    <div className="flex flex-col items-center gap-2 rounded-lg bg-yellow-50 p-3">
                      <div className="flex items-center gap-1.5 text-yellow-700">
                        <AlertTriangle className="size-4" aria-hidden="true" />
                        <span className="text-sm font-medium">Chờ lâu quá?</span>
                      </div>
                      <p className="text-xs text-yellow-600 text-center">
                        Nếu khách đã thanh toán nhưng chưa cập nhật, bấm kiểm tra.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                        onClick={handleQueryMomo}
                        disabled={isQueryPending}
                      >
                        {isQueryPending ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1.5 size-3.5" />
                        )}
                        Kiểm tra trạng thái
                      </Button>
                    </div>
                  )}
                </>
              )}

              {momoState && momoState.status === "completed" && (
                <div className="flex flex-col items-center gap-2 py-6" role="status" aria-live="polite">
                  <CheckCircle2 className="size-12 text-green-500" aria-hidden="true" />
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

              {momoState && momoState.status === "expired" && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <AlertTriangle className="size-10 text-yellow-500" aria-hidden="true" />
                  <p className="text-sm font-medium text-yellow-700">
                    Giao dịch đã hết hạn (quá 30 phút)
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMomoState(null);
                      setMomoElapsed(0);
                      handleMomoPayment();
                    }}
                    className="border-pink-200 text-pink-600"
                  >
                    Tạo giao dịch mới
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Bank Transfer (VietQR) Payment Flow */}
          {paymentMethod === "transfer" && (
            <div className="flex flex-col items-center gap-4">
              {isTransferPending && !transferState && (
                <div className="flex flex-col items-center gap-2 py-6" role="status" aria-live="polite">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" aria-hidden="true" />
                  <p className="text-muted-foreground text-sm">
                    Đang tạo mã QR chuyển khoản...
                  </p>
                </div>
              )}

              {transferState && transferState.status === "pending" && (
                <>
                  <div className="rounded-lg border-2 border-blue-200 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={transferState.qrUrl}
                      alt="VietQR"
                      className="mx-auto h-52 w-auto"
                    />
                  </div>
                  <div className="w-full space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngân hàng</span>
                      <span className="font-medium">{transferState.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số TK</span>
                      <span className="font-mono font-medium">{transferState.accountNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chủ TK</span>
                      <span className="font-medium">{transferState.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số tiền</span>
                      <span className="font-bold text-blue-600">{formatPrice(transferState.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nội dung CK</span>
                      <span className="font-mono font-medium">{transferState.addInfo}</span>
                    </div>
                  </div>

                  <div className="w-full space-y-2 border-t pt-3">
                    <Label htmlFor="ref-no" className="text-sm">
                      Mã giao dịch (không bắt buộc)
                    </Label>
                    <Input
                      id="ref-no"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="Nhập mã GD ngân hàng"
                      className="text-sm"
                    />
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-blue-600 text-lg hover:bg-blue-700"
                    onClick={handleConfirmTransfer}
                    disabled={isTransferPending}
                  >
                    {isTransferPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang xác nhận...
                      </>
                    ) : (
                      "Xác nhận đã nhận chuyển khoản"
                    )}
                  </Button>
                  <p className="text-muted-foreground text-xs text-center">
                    Khách quét mã QR bằng app ngân hàng. Xác nhận sau khi nhận được tiền.
                  </p>
                </>
              )}

              {transferState && transferState.status === "confirmed" && (
                <div className="flex flex-col items-center gap-2 py-6" role="status" aria-live="polite">
                  <CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden="true" />
                  <p className="text-lg font-bold text-green-700">
                    Xác nhận chuyển khoản thành công!
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!canPay && !showReceipt && (
        <div className="rounded-lg bg-yellow-50 p-3 text-center text-sm text-yellow-700">
          Đơn hàng chưa sẵn sàng thanh toán
        </div>
      )}

      {/* Auto-print receipt after successful payment */}
      {showReceipt && order && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-lg bg-green-50 p-4">
          <CheckCircle2 className="size-8 text-green-600" aria-hidden="true" />
          <p className="text-sm font-medium text-green-700">Thanh toán thành công!</p>
          <ReceiptPrinter
            order={{
              ...order,
              payments: paidAmount > 0 ? [{ amount: paidAmount, method: "cash" }] : undefined,
            }}
            cashierName={cashierName}
            printerConfig={printerConfig}
            preferThermal={!!printerConfig?.auto_print}
            autoPrint
            onPrintComplete={handlePrintComplete}
          />
        </div>
      )}
    </div>
  );
}
