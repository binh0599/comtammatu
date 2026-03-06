"use client";

import { useState, useTransition } from "react";
import { Plus, CheckCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDateTime,
  getStockCountStatusLabel,
} from "@comtammatu/shared";
import { createStockCount, approveStockCount } from "./actions";
import { toast } from "sonner";

interface StockCount {
  id: number;
  branch_id: number;
  counted_by: string;
  status: string;
  notes: string | null;
  counted_at: string;
  approved_by: string | null;
  approved_at: string | null;
  profiles: { full_name: string | null } | null;
}

interface Ingredient {
  id: number;
  name: string;
  unit: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "",
  submitted: "bg-yellow-600 hover:bg-yellow-700",
  approved: "bg-green-600 hover:bg-green-700",
};

let nextCountItemId = 1;

interface CountItem {
  _key: number;
  ingredient_id: number;
  actual_qty: string;
  notes: string;
}

export function StockCountTab({
  stockCounts,
  ingredients,
}: {
  stockCounts: StockCount[];
  ingredients: Ingredient[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [countItems, setCountItems] = useState<CountItem[]>([]);

  function addCountItem() {
    setCountItems((prev) => [
      ...prev,
      { _key: nextCountItemId++, ingredient_id: 0, actual_qty: "", notes: "" },
    ]);
  }

  function removeCountItem(key: number) {
    setCountItems((prev) => prev.filter((item) => item._key !== key));
  }

  function updateCountItem(
    key: number,
    field: "ingredient_id" | "actual_qty" | "notes",
    value: string
  ) {
    setCountItems((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item;
        if (field === "ingredient_id") {
          return { ...item, ingredient_id: Number(value) };
        }
        return { ...item, [field]: value };
      })
    );
  }

  function handleCreate(formData: FormData) {
    setError(null);
    const notes = (formData.get("notes") as string) || undefined;

    const validItems = countItems.filter(
      (item) => item.ingredient_id > 0 && item.actual_qty !== ""
    );

    if (validItems.length === 0) {
      setError("Vui lòng thêm ít nhất 1 nguyên liệu");
      return;
    }

    startTransition(async () => {
      const result = await createStockCount({
        items: validItems.map((item) => ({
          ingredient_id: item.ingredient_id,
          actual_qty: parseFloat(item.actual_qty),
          notes: item.notes || undefined,
        })),
        notes,
      });
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setIsCreateOpen(false);
        setCountItems([]);
        setError(null);
        toast.success("Phiếu kiểm kho đã được tạo");
      }
    });
  }

  function handleApprove(countId: number) {
    startTransition(async () => {
      const result = await approveStockCount(countId);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phiếu kiểm kho đã được duyệt");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kiểm kho</h2>
          <p className="text-muted-foreground">
            Kiểm kê cuối ngày, đối chiếu tồn kho thực tế
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) {
              setError(null);
              if (countItems.length === 0) addCountItem();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tạo phiếu kiểm kho
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Tạo phiếu kiểm kho</DialogTitle>
                <DialogDescription>
                  Nhập số lượng thực tế của từng nguyên liệu
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="notes">Ghi chú chung</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="VD: Kiểm kho cuối ngày 05/03"
                    rows={2}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Nguyên liệu</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCountItem}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Thêm dòng
                    </Button>
                  </div>
                  {countItems.map((item) => (
                    <div key={item._key} className="flex items-center gap-2">
                      <select
                        className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                        value={item.ingredient_id}
                        onChange={(e) =>
                          updateCountItem(item._key, "ingredient_id", e.target.value)
                        }
                      >
                        <option value="0">Chọn nguyên liệu</option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-9 w-28"
                        placeholder="SL thực tế"
                        value={item.actual_qty}
                        onChange={(e) =>
                          updateCountItem(item._key, "actual_qty", e.target.value)
                        }
                      />
                      <Input
                        type="text"
                        className="h-9 w-32"
                        placeholder="Ghi chú"
                        value={item.notes}
                        onChange={(e) =>
                          updateCountItem(item._key, "notes", e.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 text-red-500"
                        onClick={() => removeCountItem(item._key)}
                      >
                        X
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">#</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col">Người kiểm</TableHead>
              <TableHead scope="col">Ghi chú</TableHead>
              <TableHead scope="col">Thời gian</TableHead>
              <TableHead scope="col">Duyệt bởi</TableHead>
              <TableHead scope="col">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockCounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chưa có phiếu kiểm kho
                </TableCell>
              </TableRow>
            ) : (
              stockCounts.map((sc) => (
                <TableRow key={sc.id}>
                  <TableCell className="font-medium">#{sc.id}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[sc.status] ?? ""}>
                      {getStockCountStatusLabel(sc.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sc.profiles?.full_name ?? "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {sc.notes ?? "-"}
                  </TableCell>
                  <TableCell>{formatDateTime(sc.counted_at)}</TableCell>
                  <TableCell>
                    {sc.approved_at ? formatDateTime(sc.approved_at) : "-"}
                  </TableCell>
                  <TableCell>
                    {sc.status === "submitted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleApprove(sc.id)}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Duyệt
                      </Button>
                    )}
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
