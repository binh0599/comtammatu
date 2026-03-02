"use client";

import { useState, useTransition } from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatPrice } from "@comtammatu/shared";
import { createRecipe, deleteRecipe } from "./actions";

interface RecipeIngredient {
  id: number;
  ingredient_id: number;
  quantity: number;
  unit: string;
  waste_pct: number;
  ingredients: {
    name: string;
    unit: string;
  } | null;
}

interface Recipe {
  id: number;
  menu_item_id: number;
  yield_qty: number | null;
  yield_unit: string | null;
  total_cost: number | null;
  version: number;
  created_at: string;
  menu_items: {
    name: string;
    tenant_id: number;
  };
  recipe_ingredients: RecipeIngredient[];
}

interface Ingredient {
  id: number;
  name: string;
  unit: string;
}

interface MenuItem {
  id: number;
  name: string;
}

interface IngredientRow {
  ingredient_id: string;
  quantity: string;
  unit: string;
  waste_pct: string;
}

const EMPTY_ROW: IngredientRow = {
  ingredient_id: "",
  quantity: "",
  unit: "",
  waste_pct: "0",
};

export function RecipesTab({
  recipes,
  ingredients,
  availableMenuItems,
}: {
  recipes: Recipe[];
  ingredients: Ingredient[];
  availableMenuItems: MenuItem[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<IngredientRow[]>([{ ...EMPTY_ROW }]);
  const [menuItemId, setMenuItemId] = useState<string>("");
  const [yieldQty, setYieldQty] = useState("");
  const [yieldUnit, setYieldUnit] = useState("");

  function resetForm() {
    setError(null);
    setRows([{ ...EMPTY_ROW }]);
    setMenuItemId("");
    setYieldQty("");
    setYieldUnit("");
  }

  function addRow() {
    setRows([...rows, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof IngredientRow, value: string) {
    const updated = [...rows];
    const current = updated[index];
    if (!current) return;

    updated[index] = { ...current, [field]: value };

    // Auto-fill unit when ingredient selected
    if (field === "ingredient_id" && value) {
      const ing = ingredients.find((i) => String(i.id) === value);
      if (ing) {
        (updated[index] as IngredientRow).unit = ing.unit;
      }
    }

    setRows(updated);
  }

  function handleCreate() {
    setError(null);

    if (!menuItemId) {
      setError("Vui long chon mon an");
      return;
    }

    const validRows = rows.filter(
      (r) => r.ingredient_id && r.quantity && r.unit
    );
    if (validRows.length === 0) {
      setError("Cong thuc phai co it nhat 1 nguyen lieu");
      return;
    }

    startTransition(async () => {
      const result = await createRecipe({
        menu_item_id: Number(menuItemId),
        yield_qty: yieldQty ? Number(yieldQty) : undefined,
        yield_unit: yieldUnit || undefined,
        ingredients: validRows.map((r) => ({
          ingredient_id: Number(r.ingredient_id),
          quantity: Number(r.quantity),
          unit: r.unit,
          waste_pct: Number(r.waste_pct) || 0,
        })),
      });
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        resetForm();
        setIsCreateOpen(false);
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteRecipe(id);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cong thuc</h2>
          <p className="text-muted-foreground">
            Quan ly cong thuc che bien cua tung mon an
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={availableMenuItems.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Tao cong thuc
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tao cong thuc</DialogTitle>
              <DialogDescription>
                Dinh nghia nguyen lieu can dung cho mot mon an
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Mon an</Label>
                <Select value={menuItemId} onValueChange={setMenuItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chon mon an" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMenuItems.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>San luong</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={yieldQty}
                    onChange={(e) => setYieldQty(e.target.value)}
                    placeholder="VD: 1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Don vi san luong</Label>
                  <Input
                    value={yieldUnit}
                    onChange={(e) => setYieldUnit(e.target.value)}
                    placeholder="VD: phan, to"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Nguyen lieu</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRow}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Them dong
                  </Button>
                </div>
                <div className="space-y-2">
                  {rows.map((row, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_80px_80px_80px_40px] items-end gap-2"
                    >
                      <Select
                        value={row.ingredient_id}
                        onValueChange={(v) =>
                          updateRow(index, "ingredient_id", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nguyen lieu" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ing) => (
                            <SelectItem key={ing.id} value={String(ing.id)}>
                              {ing.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="SL"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(index, "quantity", e.target.value)
                        }
                      />
                      <Input
                        placeholder="DV"
                        value={row.unit}
                        onChange={(e) =>
                          updateRow(index, "unit", e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        placeholder="Hao%"
                        value={row.waste_pct}
                        onChange={(e) =>
                          updateRow(index, "waste_pct", e.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(index)}
                        disabled={rows.length <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
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
              <Button onClick={handleCreate} disabled={isPending}>
                {isPending ? "Dang tao..." : "Tao cong thuc"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateOpen && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="text-muted-foreground rounded-md border p-8 text-center">
          Chua co cong thuc nao
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recipes.map((recipe) => (
            <Card key={recipe.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {recipe.menu_items.name}
                    </CardTitle>
                    <CardDescription>
                      {recipe.yield_qty && recipe.yield_unit
                        ? `San luong: ${recipe.yield_qty} ${recipe.yield_unit}`
                        : "Chua co san luong"}
                      {recipe.total_cost != null && (
                        <span className="ml-2">
                          | Gia von: {formatPrice(recipe.total_cost)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Xoa cong thuc">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xoa cong thuc</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ban co chac muon xoa cong thuc cua &quot;
                          {recipe.menu_items.name}&quot;? Hanh dong nay khong
                          the hoan tac.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Huy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(recipe.id)}
                        >
                          Xoa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nguyen lieu</TableHead>
                      <TableHead className="text-right">So luong</TableHead>
                      <TableHead>Don vi</TableHead>
                      <TableHead className="text-right">Hao hut %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipe.recipe_ingredients.map((ri) => (
                      <TableRow key={ri.id}>
                        <TableCell className="font-medium">
                          {ri.ingredients?.name ?? `#${ri.ingredient_id}`}
                        </TableCell>
                        <TableCell className="text-right">
                          {ri.quantity}
                        </TableCell>
                        <TableCell>{ri.unit}</TableCell>
                        <TableCell className="text-right">
                          {ri.waste_pct > 0 ? (
                            <Badge variant="outline">{ri.waste_pct}%</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
