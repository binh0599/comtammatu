"use client";

import { useState, useTransition } from "react";
import { Plus, Send, PackageCheck, X, TrendingUp, TrendingDown } from "lucide-react";
import { formatPrice, formatDateTime, getPoStatusLabel } from "@comtammatu/shared";
import {
  createPurchaseOrder,
  sendPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from "./actions";
import type {
  Supplier,
  Branch,
  Ingredient,
  PurchaseOrder,
  CreatePoData,
  ReceivePoData,
} from "./po-types";
import { getStatusBadgeVariant } from "./po-types";
import { CreatePoForm } from "./create-po-form";
import { ReceiveDialog } from "./receive-dialog";
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
  DialogTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

interface PriceAnomaly {
  po_id: number;
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  current_price: number;
  avg_price: number;
  deviation_pct: number;
  direction: "up" | "down";
}

export function PurchaseOrdersTab({
  purchaseOrders,
  suppliers,
  ingredients,
  branches,
  priceAnomalies = [],
}: {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  ingredients: Ingredient[];
  branches: Branch[];
  priceAnomalies?: PriceAnomaly[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(data: CreatePoData) {
    setError(null);
    startTransition(async () => {
      const result = await createPurchaseOrder(data);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setIsCreateOpen(false);
        setError(null);
      }
    });
  }

  function handleSend(id: number) {
    setError(null);
    startTransition(async () => {
      const result = await sendPurchaseOrder(id);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  function handleCancel(id: number) {
    setError(null);
    startTransition(async () => {
      const result = await cancelPurchaseOrder(id);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  function handleReceive(data: ReceivePoData) {
    setError(null);
    startTransition(async () => {
      const result = await receivePurchaseOrder(data);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setReceivingPo(null);
        setError(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Đơn mua hàng</h2>
          <p className="text-muted-foreground">Quản lý đơn mua hàng từ nhà cung cấp</p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) setError(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tạo đơn mua
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tạo đơn mua hàng</DialogTitle>
              <DialogDescription>Tạo đơn mua nguyên liệu từ nhà cung cấp</DialogDescription>
            </DialogHeader>
            <CreatePoForm
              suppliers={suppliers}
              branches={branches}
              ingredients={ingredients}
              onSubmit={handleCreate}
              isPending={isPending}
              error={error}
            />
          </DialogContent>
        </Dialog>
      </div>

      {priceAnomalies.length > 0 && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 space-y-2">
          <h4 className="text-sm font-semibold text-yellow-800 flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Cảnh báo giá bất thường ({priceAnomalies.length})
          </h4>
          <div className="space-y-1">
            {priceAnomalies.map((a) => (
              <div
                key={`${a.po_id}-${a.ingredient_id}`}
                className="flex items-center gap-2 text-xs text-yellow-700"
              >
                {a.direction === "up" ? (
                  <TrendingUp className="h-3 w-3 text-red-500 shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-blue-500 shrink-0" />
                )}
                <span>
                  <strong>PO #{a.po_id}</strong> — {a.ingredient_name}:{" "}
                  {formatPrice(a.current_price)}/{a.unit} (trung bình: {formatPrice(a.avg_price)},
                  lệch{" "}
                  <span
                    className={
                      a.direction === "up"
                        ? "text-red-600 font-semibold"
                        : "text-blue-600 font-semibold"
                    }
                  >
                    {a.deviation_pct > 0 ? "+" : ""}
                    {Number(a.deviation_pct).toFixed(1)}%
                  </span>
                  )
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && !isCreateOpen && !receivingPo && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Receive Dialog */}
      <Dialog
        open={receivingPo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReceivingPo(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nhận hàng - Đơn #{receivingPo?.id}</DialogTitle>
            <DialogDescription>
              Nhập số lượng thực tế nhận được cho từng nguyên liệu
            </DialogDescription>
          </DialogHeader>
          {receivingPo && (
            <ReceiveDialog
              po={receivingPo}
              onReceive={handleReceive}
              isPending={isPending}
              error={error}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Mã</TableHead>
              <TableHead scope="col">Nhà cung cấp</TableHead>
              <TableHead scope="col">Chi nhánh</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col" className="text-right">
                Tổng tiền
              </TableHead>
              <TableHead scope="col">Ngày tạo</TableHead>
              <TableHead scope="col" className="text-right">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  Chưa có đơn mua hàng nào
                </TableCell>
              </TableRow>
            ) : (
              purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">#{po.id}</TableCell>
                  <TableCell>{po.suppliers?.name ?? `#${po.supplier_id}`}</TableCell>
                  <TableCell>{po.branches?.name ?? `#${po.branch_id}`}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(po.status)}>
                      {getPoStatusLabel(po.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {po.total != null ? formatPrice(po.total) : "-"}
                  </TableCell>
                  <TableCell>{formatDateTime(po.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {po.status === "draft" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSend(po.id)}
                            disabled={isPending}
                            title="Gửi đơn"
                          >
                            <Send className="mr-1 h-3 w-3" />
                            Gửi
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Hủy đơn">
                                <X className="mr-1 h-3 w-3" />
                                Hủy
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hủy đơn mua hàng</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bạn có chắc muốn hủy đơn #{po.id}? Hành động này không thể hoàn
                                  tác.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Đóng</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancel(po.id)}>
                                  Hủy đơn
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {(po.status === "sent" || po.status === "partially_received") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setError(null);
                              setReceivingPo(po);
                            }}
                            disabled={isPending}
                            title="Nhận hàng"
                          >
                            <PackageCheck className="mr-1 h-3 w-3" />
                            Nhận hàng
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Hủy đơn">
                                <X className="mr-1 h-3 w-3" />
                                Hủy
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hủy đơn mua hàng</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bạn có chắc muốn hủy đơn #{po.id}? Hành động này không thể hoàn
                                  tác.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Đóng</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancel(po.id)}>
                                  Hủy đơn
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
