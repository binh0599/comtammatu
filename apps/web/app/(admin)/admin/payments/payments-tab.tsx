"use client";

import { useState, useTransition, useMemo } from "react";
import { RotateCcw, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  formatPrice,
  formatDateTime,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@comtammatu/shared";
import { refundPayment } from "./actions";

// --- Types ---

interface Payment {
  id: number;
  order_id: number;
  terminal_id: number;
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
          Lich su thanh toan
        </h2>
        <p className="text-muted-foreground">
          Xem va quan ly cac giao dich thanh toan
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
            placeholder="Tim theo ma don, ma tham chieu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-8"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Trang thai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca trang thai</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {getPaymentStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Phuong thuc" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca phuong thuc</SelectItem>
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
              <SelectValue placeholder="Chi nhanh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tat ca chi nhanh</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="text-muted-foreground ml-auto text-sm">
          {filtered.length} giao dich &middot; Tong:{" "}
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
              <TableHead>Ma don</TableHead>
              <TableHead>Chi nhanh</TableHead>
              <TableHead>Phuong thuc</TableHead>
              <TableHead className="text-right">So tien</TableHead>
              <TableHead className="text-right">Tip</TableHead>
              <TableHead>Trang thai</TableHead>
              <TableHead>Thoi gian</TableHead>
              <TableHead>Ma tham chieu</TableHead>
              <TableHead className="text-right">Thao tac</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co giao dich thanh toan nao
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
                        title="Chi tiet"
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
                              title="Hoan tien"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Hoan tien giao dich
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Ban co chac muon hoan tien{" "}
                                {formatPrice(Number(p.amount))} cho don{" "}
                                {p.orders?.order_number ?? `#${p.order_id}`}?
                                Hanh dong nay khong the hoan tac.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Huy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRefund(p.id)}
                                disabled={isPending}
                              >
                                {isPending ? "Dang xu ly..." : "Hoan tien"}
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
            <DialogTitle>Chi tiet thanh toan</DialogTitle>
            <DialogDescription>
              Thong tin giao dich #{detailPayment?.id}
            </DialogDescription>
          </DialogHeader>
          {detailPayment && (
            <div className="grid gap-3 py-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Ma don hang:</span>
                <span className="font-medium">
                  {detailPayment.orders?.order_number ??
                    `#${detailPayment.order_id}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Chi nhanh:</span>
                <span>
                  {detailPayment.pos_terminals?.branches?.name ?? "—"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Thiet bi:</span>
                <span>{detailPayment.pos_terminals?.name ?? "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Phuong thuc:</span>
                <span>{getPaymentMethodLabel(detailPayment.method)}</span>
              </div>
              {detailPayment.provider && (
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Nha cung cap:</span>
                  <span>{detailPayment.provider}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">So tien:</span>
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
                <span className="text-muted-foreground">Tong don hang:</span>
                <span>
                  {detailPayment.orders
                    ? formatPrice(Number(detailPayment.orders.total))
                    : "—"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Trang thai:</span>
                <Badge
                  className={STATUS_BADGE[detailPayment.status] ?? ""}
                >
                  {getPaymentStatusLabel(detailPayment.status)}
                </Badge>
              </div>
              {detailPayment.reference_no && (
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">
                    Ma tham chieu:
                  </span>
                  <span className="font-mono">
                    {detailPayment.reference_no}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Thoi gian:</span>
                <span>
                  {detailPayment.paid_at
                    ? formatDateTime(detailPayment.paid_at)
                    : formatDateTime(detailPayment.created_at)}
                </span>
              </div>
              {detailPayment.orders?.type && (
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Loai don:</span>
                  <span>
                    {detailPayment.orders.type === "dine_in"
                      ? "Tai cho"
                      : detailPayment.orders.type === "takeaway"
                        ? "Mang di"
                        : "Giao hang"}
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
