"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Send, PackageCheck, X } from "lucide-react";
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
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, formatDateTime, getPoStatusLabel } from "@comtammatu/shared";
import {
  createPurchaseOrder,
  sendPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from "./actions";

interface Supplier {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Ingredient {
  id: number;
  name: string;
  unit: string;
}

interface PoItem {
  id: number;
  ingredient_id: number;
  quantity: number;
  unit_price: number;
  received_qty: number;
  ingredients: { name: string; unit: string } | null;
}

interface PurchaseOrder {
  id: number;
  supplier_id: number;
  branch_id: number;
  status: string;
  total: number | null;
  notes: string | null;
  expected_at: string | null;
  ordered_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  suppliers: { name: string } | null;
  branches: { name: string } | null;
  purchase_order_items: PoItem[];
}

interface NewItem {
  ingredient_id: string;
  quantity: string;
  unit_price: string;
}

function getStatusBadgeVariant(
  status: string
): "secondary" | "outline" | "default" | "destructive" {
  switch (status) {
    case "draft":
      return "secondary";
    case "sent":
      return "outline";
    case "received":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

function CreatePoForm({
  suppliers,
  branches,
  ingredients,
  onSubmit,
  isPending,
  error,
}: {
  suppliers: Supplier[];
  branches: Branch[];
  ingredients: Ingredient[];
  onSubmit: (data: {
    supplier_id: number;
    branch_id: number;
    expected_at?: string;
    notes?: string;
    items: { ingredient_id: number; quantity: number; unit_price: number }[];
  }) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<NewItem[]>([
    { ingredient_id: "", quantity: "", unit_price: "" },
  ]);

  function addRow() {
    setItems([...items, { ingredient_id: "", quantity: "", unit_price: "" }]);
  }

  function removeRow(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof NewItem, value: string) {
    const updated = [...items];
    const current = updated[index];
    if (!current) return;
    updated[index] = { ...current, [field]: value };
    setItems(updated);
  }

  function getLineTotal(item: NewItem): number {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return qty * price;
  }

  const grandTotal = items.reduce((sum, item) => sum + getLineTotal(item), 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      supplier_id: parseInt(supplierId),
      branch_id: parseInt(branchId),
      expected_at: expectedAt || undefined,
      notes: notes || undefined,
      items: items.map((item) => ({
        ingredient_id: parseInt(item.ingredient_id),
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Nha cung cap *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Chon nha cung cap" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Chi nhanh *</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Chon chi nhanh" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="expected_at">Ngay giao du kien</Label>
            <Input
              id="expected_at"
              type="date"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Ghi chu</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chu cho don mua hang"
              rows={2}
            />
          </div>
        </div>

        {/* Item rows */}
        <div className="space-y-2">
          <Label>Danh sach nguyen lieu *</Label>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nguyen lieu</TableHead>
                  <TableHead className="w-[120px]">So luong</TableHead>
                  <TableHead className="w-[140px]">Don gia</TableHead>
                  <TableHead className="w-[120px] text-right">
                    Thanh tien
                  </TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={item.ingredient_id}
                        onValueChange={(v) =>
                          updateItem(index, "ingredient_id", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chon" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ing) => (
                            <SelectItem key={ing.id} value={String(ing.id)}>
                              {ing.name} ({ing.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", e.target.value)
                        }
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(index, "unit_price", e.target.value)
                        }
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(getLineTotal(item))}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(index)}
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1 h-4 w-4" />
              Them dong
            </Button>
            <div className="text-lg font-semibold">
              Tong: {formatPrice(grandTotal)}
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Dang tao..." : "Tao don mua"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ReceiveDialog({
  po,
  onReceive,
  isPending,
  error,
}: {
  po: PurchaseOrder;
  onReceive: (data: {
    po_id: number;
    items: { po_item_id: number; received_qty: number }[];
  }) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [receivedQtys, setReceivedQtys] = useState<Record<number, string>>(
    () => {
      const initial: Record<number, string> = {};
      for (const item of po.purchase_order_items) {
        initial[item.id] = String(item.quantity);
      }
      return initial;
    }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onReceive({
      po_id: po.id,
      items: po.purchase_order_items.map((item) => ({
        po_item_id: item.id,
        received_qty: parseFloat(receivedQtys[item.id] ?? "0"),
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="py-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nguyen lieu</TableHead>
                <TableHead className="text-right">Dat hang</TableHead>
                <TableHead className="w-[140px]">Thuc nhan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.purchase_order_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.ingredients?.name ?? `#${item.ingredient_id}`}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity} {item.ingredients?.unit ?? ""}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={receivedQtys[item.id] ?? ""}
                      onChange={(e) =>
                        setReceivedQtys({
                          ...receivedQtys,
                          [item.id]: e.target.value,
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Dang xu ly..." : "Xac nhan nhan hang"}
        </Button>
      </DialogFooter>
    </form>
  );
}

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

  function handleCreate(data: {
    supplier_id: number;
    branch_id: number;
    expected_at?: string;
    notes?: string;
    items: { ingredient_id: number; quantity: number; unit_price: number }[];
  }) {
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

  function handleReceive(data: {
    po_id: number;
    items: { po_item_id: number; received_qty: number }[];
  }) {
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
              <TableHead>Ma</TableHead>
              <TableHead>Nha cung cap</TableHead>
              <TableHead>Chi nhanh</TableHead>
              <TableHead>Trang thai</TableHead>
              <TableHead className="text-right">Tong tien</TableHead>
              <TableHead>Ngay tao</TableHead>
              <TableHead className="text-right">Thao tac</TableHead>
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
