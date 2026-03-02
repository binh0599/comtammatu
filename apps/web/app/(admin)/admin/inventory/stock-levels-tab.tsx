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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initStockLevel } from "./actions";

interface StockLevel {
  id: number;
  ingredient_id: number;
  branch_id: number;
  quantity: number;
  version: number;
  updated_at: string;
  ingredients: {
    name: string;
    unit: string;
    min_stock: number | null;
    max_stock: number | null;
    tenant_id: number;
  };
  branches: {
    name: string;
  };
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

export function StockLevelsTab({
  stockLevels,
  ingredients,
  branches,
}: {
  stockLevels: StockLevel[];
  ingredients: Ingredient[];
  branches: Branch[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleInit(formData: FormData) {
    setError(null);
    const ingredientId = Number(formData.get("ingredient_id"));
    const branchId = Number(formData.get("branch_id"));
    const quantity = Number(formData.get("quantity"));

    if (!ingredientId || !branchId) {
      setError("Vui long chon nguyen lieu va chi nhanh");
      return;
    }

    startTransition(async () => {
      const result = await initStockLevel({
        ingredient_id: ingredientId,
        branch_id: branchId,
        quantity: quantity || 0,
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
          <h2 className="text-2xl font-bold tracking-tight">Ton kho</h2>
          <p className="text-muted-foreground">
            Theo doi so luong nguyen lieu tai tung chi nhanh
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
              Khoi tao ton kho
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleInit}>
              <DialogHeader>
                <DialogTitle>Khoi tao ton kho</DialogTitle>
                <DialogDescription>
                  Tao ban ghi ton kho cho nguyen lieu tai chi nhanh
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
                <div className="grid gap-2">
                  <Label htmlFor="quantity">So luong ban dau</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue="0"
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
                  {isPending ? "Dang tao..." : "Khoi tao"}
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
              <TableHead>Nguyen lieu</TableHead>
              <TableHead>Don vi</TableHead>
              <TableHead>Chi nhanh</TableHead>
              <TableHead className="text-right">So luong</TableHead>
              <TableHead className="text-right">Toi thieu</TableHead>
              <TableHead className="text-right">Toi da</TableHead>
              <TableHead>Trang thai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockLevels.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co du lieu ton kho
                </TableCell>
              </TableRow>
            ) : (
              stockLevels.map((sl) => {
                const isLow =
                  sl.ingredients.min_stock != null &&
                  sl.quantity <= sl.ingredients.min_stock;
                return (
                  <TableRow key={sl.id}>
                    <TableCell className="font-medium">
                      {sl.ingredients.name}
                    </TableCell>
                    <TableCell>{sl.ingredients.unit}</TableCell>
                    <TableCell>{sl.branches.name}</TableCell>
                    <TableCell className="text-right">{sl.quantity}</TableCell>
                    <TableCell className="text-right">
                      {sl.ingredients.min_stock ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {sl.ingredients.max_stock ?? "-"}
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="destructive">Sap het</Badge>
                      ) : (
                        <Badge
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Du hang
                        </Badge>
                      )}
                    </TableCell>
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
