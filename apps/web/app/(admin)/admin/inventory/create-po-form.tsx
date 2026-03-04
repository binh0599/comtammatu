"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { DialogFooter } from "@/components/ui/dialog";
import { formatPrice } from "@comtammatu/shared";
import type { Supplier, Branch, Ingredient, NewItem, CreatePoData } from "./po-types";

export function CreatePoForm({
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
  onSubmit: (data: CreatePoData) => void;
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
            <Label htmlFor="po-supplier">Nhà cung cấp *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger id="po-supplier">
                <SelectValue placeholder="Chọn nhà cung cấp" />
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
            <Label htmlFor="po-branch">Chi nhánh *</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger id="po-branch">
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
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="expected_at">Ngày giao dự kiến</Label>
            <Input
              id="expected_at"
              type="date"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú cho đơn mua hàng"
              rows={2}
            />
          </div>
        </div>

        {/* Item rows */}
        <div className="space-y-2">
          <Label>Danh sách nguyên liệu *</Label>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Nguyên liệu</TableHead>
                  <TableHead scope="col" className="w-[120px]">Số lượng</TableHead>
                  <TableHead scope="col" className="w-[140px]">Đơn giá</TableHead>
                  <TableHead scope="col" className="w-[120px] text-right">
                    Thành tiền
                  </TableHead>
                  <TableHead scope="col" className="w-[50px]" />
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
                          <SelectValue placeholder="Chọn" />
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
                        aria-label="Xóa dòng"
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
              Thêm dòng
            </Button>
            <div className="text-lg font-semibold">
              Tổng: {formatPrice(grandTotal)}
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang tạo..." : "Tạo đơn mua"}
        </Button>
      </DialogFooter>
    </form>
  );
}
