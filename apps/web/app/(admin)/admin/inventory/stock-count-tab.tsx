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
  const [countItems, setCountItems] = useState<
    { ingredient_id: number; actual_qty: string; notes: string }[]
  >([]);

  function addCountItem() {
    setCountItems((prev) => [
      ...prev,
      { ingredient_id: 0, actual_qty: "", notes: "" },
    ]);
  }

  function removeCountItem(index: number) {
    setCountItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCountItem(
    index: number,
    field: "ingredient_id" | "actual_qty" | "notes",
    value: string
  ) {
    setCountItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function handleCreate(formData: FormData) {
    setError(null);
    const notes = (formData.get("notes") as string) || undefined;

    const validItems = countItems.filter(
      (item) => item.ingredient_id > 0 && item.actual_qty !== ""
    );

    if (validItems.length === 0) {
      setError("Vui long them it nhat 1 nguyen lieu");
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
        toast.success("Phieu kiem kho da duoc tao");
      }
    });
  }

  function handleApprove(countId: number) {
    startTransition(async () => {
      const result = await approveStockCount(countId);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phieu kiem kho da duoc duyet");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kiem kho</h2>
          <p className="text-muted-foreground">
            Kiem ke cuoi ngay, doi chieu ton kho thuc te
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
              Tao phieu kiem kho
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Tao phieu kiem kho</DialogTitle>
                <DialogDescription>
                  Nhap so luong thuc te cua tung nguyen lieu
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="notes">Ghi chu chung</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="VD: Kiem kho cuoi ngay 05/03"
                    rows={2}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Nguyen lieu</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCountItem}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Them dong
                    </Button>
                  </div>
                  {countItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                        value={item.ingredient_id}
                        onChange={(e) =>
                          updateCountItem(index, "ingredient_id", e.target.value)
                        }
                      >
                        <option value="0">Chon nguyen lieu</option>
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
                        placeholder="SL thuc te"
                        value={item.actual_qty}
                        onChange={(e) =>
                          updateCountItem(index, "actual_qty", e.target.value)
                        }
                      />
                      <Input
                        type="text"
                        className="h-9 w-32"
                        placeholder="Ghi chu"
                        value={item.notes}
                        onChange={(e) =>
                          updateCountItem(index, "notes", e.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 text-red-500"
                        onClick={() => removeCountItem(index)}
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
                  Huy
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Dang tao..." : "Tao phieu"}
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
              <TableHead scope="col">Trang thai</TableHead>
              <TableHead scope="col">Nguoi kiem</TableHead>
              <TableHead scope="col">Ghi chu</TableHead>
              <TableHead scope="col">Thoi gian</TableHead>
              <TableHead scope="col">Duyet boi</TableHead>
              <TableHead scope="col">Thao tac</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockCounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co phieu kiem kho
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
                        Duyet
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
