"use client";

import { useState, useTransition } from "react";
import { Plus, Send, PackageCheck, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { formatPrice, formatDateTime, getPoStatusLabel } from "@comtammatu/shared";
import {
  createPurchaseOrder,
  sendPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from "./actions";
import type { Supplier, Branch, Ingredient, PurchaseOrder, CreatePoData, ReceivePoData } from "./po-types";
import { getStatusBadgeVariant } from "./po-types";
import { CreatePoForm } from "./create-po-form";
import { ReceiveDialog } from "./receive-dialog";

export function PurchaseOrdersTab({
  purchaseOrders,
  suppliers,
  ingredients,
  branches,
}: {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  ingredients: Ingredient[];
  branches: Branch[];
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
          <h2 className="text-2xl font-bold tracking-tight">Don mua hang</h2>
          <p className="text-muted-foreground">
            Quan ly don mua hang tu nha cung cap
          </p>
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
              Tao don mua
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tao don mua hang</DialogTitle>
              <DialogDescription>
                Tao don mua nguyen lieu tu nha cung cap
              </DialogDescription>
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

      {error && !isCreateOpen && !receivingPo && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
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
            <DialogTitle>Nhan hang - Don #{receivingPo?.id}</DialogTitle>
            <DialogDescription>
              Nhap so luong thuc te nhan duoc cho tung nguyen lieu
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
              <TableHead scope="col">Ma</TableHead>
              <TableHead scope="col">Nha cung cap</TableHead>
              <TableHead scope="col">Chi nhanh</TableHead>
              <TableHead scope="col">Trang thai</TableHead>
              <TableHead scope="col" className="text-right">Tong tien</TableHead>
              <TableHead scope="col">Ngay tao</TableHead>
              <TableHead scope="col" className="text-right">Thao tac</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co don mua hang nao
                </TableCell>
              </TableRow>
            ) : (
              purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">#{po.id}</TableCell>
                  <TableCell>
                    {po.suppliers?.name ?? `#${po.supplier_id}`}
                  </TableCell>
                  <TableCell>
                    {po.branches?.name ?? `#${po.branch_id}`}
                  </TableCell>
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
                            title="Gui don"
                          >
                            <Send className="mr-1 h-3 w-3" />
                            Gui
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Huy don"
                              >
                                <X className="mr-1 h-3 w-3" />
                                Huy
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Huy don mua hang
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ban co chac muon huy don #{po.id}? Hanh dong
                                  nay khong the hoan tac.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Dong</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancel(po.id)}
                                >
                                  Huy don
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {po.status === "sent" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setError(null);
                              setReceivingPo(po);
                            }}
                            disabled={isPending}
                            title="Nhan hang"
                          >
                            <PackageCheck className="mr-1 h-3 w-3" />
                            Nhan hang
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Huy don"
                              >
                                <X className="mr-1 h-3 w-3" />
                                Huy
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Huy don mua hang
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ban co chac muon huy don #{po.id}? Hanh dong
                                  nay khong the hoan tac.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Dong</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancel(po.id)}
                                >
                                  Huy don
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
