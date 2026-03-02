"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDateTime,
  getStockMovementTypeLabel,
  STOCK_MOVEMENT_TYPES,
} from "@comtammatu/shared";
import { createStockMovement } from "./actions";

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

const TYPE_BADGE_VARIANTS: Record<
  string,
  { className: string }
> = {
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    const ingredientId = Number(formData.get("ingredient_id"));
    const branchId = Number(formData.get("branch_id"));
    const type = formData.get("type") as string;
    const quantity = Number(formData.get("quantity"));
    const notes = (formData.get("notes") as string) || undefined;

    if (!ingredientId || !branchId || !type) {
      setError("Vui long dien day du thong tin");
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nhap / Xuat kho</h2>
          <p className="text-muted-foreground">
            Lich su nhap, xuat, dieu chinh ton kho
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
              Tao phieu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Tao phieu nhap/xuat</DialogTitle>
                <DialogDescription>
                  Ghi nhan bien dong ton kho
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="ingredient_id">Nguyen lieu</Label>
                  <Select name="ingredient_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Chon nguyen lieu" />
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
                  <Label htmlFor="branch_id">Chi nhanh</Label>
                  <Select name="branch_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Chon chi nhanh" />
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
                    <Label htmlFor="type">Loai phieu</Label>
                    <Select name="type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Chon loai" />
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
                    <Label htmlFor="quantity">So luong</Label>
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
                  <Label htmlFor="notes">Ghi chu</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="VD: Nhap hang tu nha cung cap ABC"
                    rows={3}
                  />
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

      {error && !isCreateOpen && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loai</TableHead>
              <TableHead>Nguyen lieu</TableHead>
              <TableHead className="text-right">So luong</TableHead>
              <TableHead>Chi nhanh</TableHead>
              <TableHead>Ghi chu</TableHead>
              <TableHead>Nguoi tao</TableHead>
              <TableHead>Thoi gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co lich su nhap/xuat
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
                    <TableCell className="font-medium">
                      {mov.ingredients.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {mov.quantity} {mov.ingredients.unit}
                    </TableCell>
                    <TableCell>{mov.branches.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {mov.notes ?? "-"}
                    </TableCell>
                    <TableCell>
                      {mov.profiles?.full_name ?? "-"}
                    </TableCell>
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
