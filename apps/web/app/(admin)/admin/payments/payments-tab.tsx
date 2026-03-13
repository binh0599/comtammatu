"use client";

import { useState, useTransition, useMemo } from "react";
import { RotateCcw, Eye, Search } from "lucide-react";
import {
  formatPrice,
  formatDateTime,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@comtammatu/shared";
import { refundPayment } from "./actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

// --- Types ---

interface Payment {
  id: number;
  order_id: number;
  terminal_id: number | null;
  method: string;
  provider: string | null;
  amount: number;
  tip: number;
  reference_no: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  orders: {
    id: number;
    order_number: string;
    total: number;
    type: string;
  } | null;
  pos_terminals: {
    id: number;
    name: string;
    branch_id: number;
    branches: { id: number; name: string } | null;
  } | null;
}

interface Branch {
  id: number;
  name: string;
}

interface PaymentsTabProps {
  payments: Payment[];
  branches: Branch[];
}

// --- Badge styles ---

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-green-100 text-green-800 hover:bg-green-100",
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  failed: "bg-red-100 text-red-800 hover:bg-red-100",
  refunded: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

// --- Component ---

export function PaymentsTab({ payments, branches }: PaymentsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (methodFilter !== "all" && p.method !== methodFilter) return false;
      if (
        branchFilter !== "all" &&
        p.pos_terminals?.branches?.id !== Number(branchFilter)
      )
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const orderNum = p.orders?.order_number?.toLowerCase() ?? "";
        const ref = p.reference_no?.toLowerCase() ?? "";
        if (!orderNum.includes(q) && !ref.includes(q)) return false;
      }
      return true;
    });
  }, [payments, statusFilter, methodFilter, branchFilter, searchQuery]);

  function handleRefund(paymentId: number) {
    setError(null);
    startTransition(async () => {
      const result = await refundPayment(paymentId);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setDetailPayment(null);
      }
    });
  }

  const totalAmount = filtered.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalTip = filtered.reduce((sum, p) => sum + Number(p.tip), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Lịch sử thanh toán
        </h2>
        <p className="text-muted-foreground">
          Xem và quản lý các giao dịch thanh toán
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Tìm theo mã đơn, mã tham chiếu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-8"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {getPaymentStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Phương thức" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phương thức</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {getPaymentMethodLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {branches.length > 1 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Chi nhánh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chi nhánh</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="text-muted-foreground ml-auto text-sm">
          {filtered.length} giao dịch &middot; Tổng:{" "}
          <span className="font-medium text-black">
            {formatPrice(totalAmount)}
          </span>
          {totalTip > 0 && (
            <>
              {" "}
              &middot; Tip:{" "}
              <span className="font-medium text-black">
                {formatPrice(totalTip)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Phương thức</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead className="text-right">Tip</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Mã tham chiếu</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chưa có giao dịch thanh toán nào
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">
                    {p.orders?.order_number ?? `#${p.order_id}`}
                  </TableCell>
                  <TableCell>
                    {p.pos_terminals?.branches?.name ?? "—"}
                  </TableCell>
                  <TableCell>{getPaymentMethodLabel(p.method)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(Number(p.amount))}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(p.tip) > 0 ? formatPrice(Number(p.tip)) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        STATUS_BADGE[p.status] ?? ""
                      }
                    >
                      {getPaymentStatusLabel(p.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.paid_at ? formatDateTime(p.paid_at) : formatDateTime(p.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {p.reference_no ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Chi tiết"
                        onClick={() => {
                          setError(null);
                          setDetailPayment(p);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {p.status === "completed" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Hoàn tiền"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Hoàn tiền giao dịch
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn hoàn tiền{" "}
                                {formatPrice(Number(p.amount))} cho đơn{" "}
                                {p.orders?.order_number ?? `#${p.order_id}`}?
                                Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRefund(p.id)}
                                disabled={isPending}
                              >
                                {isPending ? "Đang xử lý..." : "Hoàn tiền"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={detailPayment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailPayment(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết thanh toán</DialogTitle>
            <DialogDescription>
              Thông tin giao dịch #{detailPayment?.id}
            </DialogDescription>
          </DialogHeader>
          {detailPayment && (
            <div className="grid gap-3 py-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Mã đơn hàng:</span>
                <span className="font-medium">
                  {detailPayment.orders?.order_number ??
                    `#${detailPayment.order_id}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Chi nhánh:</span>
                <span>
                  {detailPayment.pos_terminals?.branches?.name ?? "—"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Thiết bị:</span>
                <span>{detailPayment.pos_terminals?.name ?? "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Phương thức:</span>
                <span>{getPaymentMethodLabel(detailPayment.method)}</span>
              </div>
              {detailPayment.provider && (
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Nhà cung cấp:</span>
                  <span>{detailPayment.provider}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Số tiền:</span>
                <span className="font-medium">
                  {formatPrice(Number(detailPayment.amount))}
                </span>
              </div>
              {Number(detailPayment.tip) > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Tip:</span>
                  <span>{formatPrice(Number(detailPayment.tip))}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Tổng đơn hàng:</span>
                <span>
                  {detailPayment.orders
                    ? formatPrice(Number(detailPayment.orders.total))
                    : "—"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Trạng thái:</span>
                <Badge
                  className={STATUS_BADGE[detailPayment.status] ?? ""}
                >
                  {getPaymentStatusLabel(detailPayment.status)}
                </Badge>
              </div>
              {detailPayment.reference_no && (
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">
                    Mã tham chiếu:
                  </span>
                  <span className="font-mono">
                    {detailPayment.reference_no}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Thời gian:</span>
                <span>
                  {detailPayment.paid_at
                    ? formatDateTime(detailPayment.paid_at)
                    : formatDateTime(detailPayment.created_at)}
                </span>
              </div>
              {detailPayment.orders?.type && (
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Loại đơn:</span>
                  <span>
                    {detailPayment.orders.type === "dine_in"
                      ? "Tại chỗ"
                      : detailPayment.orders.type === "takeaway"
                        ? "Mang đi"
                        : "Giao hàng"}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
