"use client";

import { useState, useTransition } from "react";
import { Plus, ArrowRightLeft, Trash2 } from "lucide-react";
import {
  formatDateTime,
  getStockMovementTypeLabel,
  STOCK_MOVEMENT_TYPES,
} from "@comtammatu/shared";
import { createStockMovement, createBranchTransfer } from "./actions";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
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
  Textarea,
} from "@comtammatu/ui";

interface StockMovement {
  id: number;
  ingredient_id: number;
  branch_id: number;
  type: string;
  quantity: number;
  cost_at_time: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  ingredients: {
    name: string;
    unit: string;
    tenant_id: number;
  };
  branches: {
    name: string;
  };
  profiles: {
    full_name: string | null;
  } | null;
}

interface Ingredient {
  id: number;
  name: string;
  unit: string;
}

interface Branch {
  id: number;
  name: string;
}

interface TransferItem {
  ingredient_id: number;
  quantity: number;
}

const TYPE_BADGE_VARIANTS: Record<string, { className: string }> = {
  in: { className: "bg-green-600 hover:bg-green-700" },
  out: { className: "bg-red-600 hover:bg-red-700" },
  waste: { className: "bg-yellow-600 hover:bg-yellow-700" },
  transfer: { className: "bg-blue-600 hover:bg-blue-700" },
  adjust: { className: "bg-gray-600 hover:bg-gray-700" },
};

export function StockMovementsTab({
  movements,
  ingredients,
  branches,
}: {
  movements: StockMovement[];
  ingredients: Ingredient[];
  branches: Branch[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Transfer dialog state
  const [transferFromBranch, setTransferFromBranch] = useState("");
  const [transferToBranch, setTransferToBranch] = useState("");
  const [transferItems, setTransferItems] = useState<TransferItem[]>([
    { ingredient_id: 0, quantity: 0 },
  ]);
  const [transferNotes, setTransferNotes] = useState("");

  function handleCreate(formData: FormData) {
    setError(null);
    const ingredientId = Number(formData.get("ingredient_id"));
    const branchId = Number(formData.get("branch_id"));
    const type = formData.get("type") as string;
    const quantity = Number(formData.get("quantity"));
    const notes = (formData.get("notes") as string) || undefined;

    if (!ingredientId || !branchId || !type) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    startTransition(async () => {
      const result = await createStockMovement({
        ingredient_id: ingredientId,
        branch_id: branchId,
        type,
        quantity,
        notes,
      });
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setIsCreateOpen(false);
        setError(null);
      }
    });
  }

  function resetTransferForm() {
    setTransferFromBranch("");
    setTransferToBranch("");
    setTransferItems([{ ingredient_id: 0, quantity: 0 }]);
    setTransferNotes("");
    setError(null);
  }

  function handleTransfer() {
    setError(null);
    const fromId = Number(transferFromBranch);
    const toId = Number(transferToBranch);

    if (!fromId || !toId) {
      setError("Vui lòng chọn chi nhánh xuất và nhận");
      return;
    }
    if (fromId === toId) {
      setError("Chi nhánh xuất và nhận phải khác nhau");
      return;
    }

    const validItems = transferItems.filter((i) => i.ingredient_id > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      setError("Vui lòng thêm ít nhất 1 nguyên liệu");
      return;
    }

    startTransition(async () => {
      const result = await createBranchTransfer({
        from_branch_id: fromId,
        to_branch_id: toId,
        items: validItems,
        notes: transferNotes || undefined,
      });
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setIsTransferOpen(false);
        resetTransferForm();
      }
    });
  }

  function addTransferItem() {
    setTransferItems((prev) => [...prev, { ingredient_id: 0, quantity: 0 }]);
  }

  function removeTransferItem(index: number) {
    setTransferItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTransferItem(index: number, field: keyof TransferItem, value: number) {
    setTransferItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nhập / Xuất kho</h2>
          <p className="text-muted-foreground">Lịch sử nhập, xuất, điều chỉnh tồn kho</p>
        </div>
        <div className="flex gap-2">
          {/* Transfer dialog */}
          <Dialog
            open={isTransferOpen}
            onOpenChange={(open) => {
              setIsTransferOpen(open);
              if (open) resetTransferForm();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Chuyển kho
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Chuyển kho giữa chi nhánh</DialogTitle>
                <DialogDescription>
                  Chuyển nguyên liệu từ chi nhánh này sang chi nhánh khác
                </DialogDescription>
              </DialogHeader>
              {error && isTransferOpen && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Chi nhánh xuất</Label>
                    <Select value={transferFromBranch} onValueChange={setTransferFromBranch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chi nhánh" />
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
                  <div className="grid gap-2">
                    <Label>Chi nhánh nhận</Label>
                    <Select value={transferToBranch} onValueChange={setTransferToBranch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chi nhánh" />
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

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Nguyên liệu chuyển</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addTransferItem}>
                      <Plus className="mr-1 h-3 w-3" />
                      Thêm dòng
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {transferItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={item.ingredient_id ? String(item.ingredient_id) : ""}
                          onValueChange={(v) => updateTransferItem(idx, "ingredient_id", Number(v))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Chọn nguyên liệu" />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredients.map((ing) => (
                              <SelectItem key={ing.id} value={String(ing.id)}>
                                {ing.name} ({ing.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="w-24"
                          placeholder="Số lượng"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateTransferItem(idx, "quantity", Number(e.target.value))
                          }
                        />
                        {transferItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => removeTransferItem(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Ghi chú</Label>
                  <Textarea
                    placeholder="VD: Chuyển hàng phục vụ sự kiện"
                    rows={2}
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    maxLength={500}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTransferOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleTransfer} disabled={isPending}>
                  {isPending ? "Đang xử lý..." : "Xác nhận chuyển kho"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create movement dialog */}
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
                Tạo phiếu
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form action={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Tạo phiếu nhập/xuất</DialogTitle>
                  <DialogDescription>Ghi nhận biến động tồn kho</DialogDescription>
                </DialogHeader>
                {error && isCreateOpen && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
                )}
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ingredient_id">Nguyên liệu</Label>
                    <Select name="ingredient_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn nguyên liệu" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((ing) => (
                          <SelectItem key={ing.id} value={String(ing.id)}>
                            {ing.name} ({ing.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="branch_id">Chi nhánh</Label>
                    <Select name="branch_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chi nhánh" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Loại phiếu</Label>
                      <Select name="type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại" />
                        </SelectTrigger>
                        <SelectContent>
                          {STOCK_MOVEMENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {getStockMovementTypeLabel(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="quantity">Số lượng</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Ghi chú</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="VD: Nhập hàng từ nhà cung cấp ABC"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Đang tạo..." : "Tạo phiếu"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && !isCreateOpen && !isTransferOpen && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Loại</TableHead>
              <TableHead scope="col">Nguyên liệu</TableHead>
              <TableHead scope="col" className="text-right">
                Số lượng
              </TableHead>
              <TableHead scope="col">Chi nhánh</TableHead>
              <TableHead scope="col">Ghi chú</TableHead>
              <TableHead scope="col">Người tạo</TableHead>
              <TableHead scope="col">Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  Chưa có lịch sử nhập/xuất
                </TableCell>
              </TableRow>
            ) : (
              movements.map((mov) => {
                const badgeStyle = TYPE_BADGE_VARIANTS[mov.type] ?? {
                  className: "",
                };
                return (
                  <TableRow key={mov.id}>
                    <TableCell>
                      <Badge className={badgeStyle.className}>
                        {getStockMovementTypeLabel(mov.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{mov.ingredients.name}</TableCell>
                    <TableCell className="text-right">
                      {mov.quantity} {mov.ingredients.unit}
                    </TableCell>
                    <TableCell>{mov.branches.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{mov.notes ?? "-"}</TableCell>
                    <TableCell>{mov.profiles?.full_name ?? "-"}</TableCell>
                    <TableCell>{formatDateTime(mov.created_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
