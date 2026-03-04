"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@comtammatu/shared";
import { createIngredient, updateIngredient, deleteIngredient } from "./actions";

interface Ingredient {
  id: number;
  name: string;
  sku: string | null;
  unit: string;
  category: string | null;
  cost_price: number | null;
  min_stock: number | null;
  max_stock: number | null;
  is_active: boolean;
  created_at: string;
}

function IngredientForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
  submitLabel,
  pendingLabel,
}: {
  defaultValues?: Ingredient;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [isActive, setIsActive] = useState(defaultValues?.is_active ?? true);

  return (
    <form action={onSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Tên nguyên liệu</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            placeholder="VD: Thịt sườn"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              name="sku"
              defaultValue={defaultValues?.sku ?? ""}
              placeholder="VD: TS001"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unit">Đơn vị</Label>
            <Input
              id="unit"
              name="unit"
              defaultValue={defaultValues?.unit}
              placeholder="VD: kg, lít, cái"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Danh mục</Label>
            <Input
              id="category"
              name="category"
              defaultValue={defaultValues?.category ?? ""}
              placeholder="VD: Thịt, Rau, Gia vị"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cost_price">Giá nhập</Label>
            <Input
              id="cost_price"
              name="cost_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.cost_price ?? ""}
              placeholder="0"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="min_stock">Tồn kho tối thiểu</Label>
            <Input
              id="min_stock"
              name="min_stock"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.min_stock ?? ""}
              placeholder="0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="max_stock">Tồn kho tối đa</Label>
            <Input
              id="max_stock"
              name="max_stock"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.max_stock ?? ""}
              placeholder="0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
          <input type="hidden" name="is_active" value={String(isActive)} />
          <Label htmlFor="is_active">Đang hoạt động</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function IngredientsTab({
  ingredients,
}: {
  ingredients: Ingredient[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createIngredient(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setIsCreateOpen(false);
        setError(null);
      }
    });
  }

  function handleUpdate(id: number, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateIngredient(id, formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setEditingItem(null);
        setError(null);
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteIngredient(id);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nguyên liệu</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách nguyên liệu của nhà hàng
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
              Thêm nguyên liệu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm nguyên liệu</DialogTitle>
              <DialogDescription>
                Tạo nguyên liệu mới cho nhà hàng
              </DialogDescription>
            </DialogHeader>
            <IngredientForm
              onSubmit={handleCreate}
              isPending={isPending}
              error={error}
              submitLabel="Tạo"
              pendingLabel="Đang tạo..."
            />
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateOpen && !editingItem && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Tên</TableHead>
              <TableHead scope="col">SKU</TableHead>
              <TableHead scope="col">Đơn vị</TableHead>
              <TableHead scope="col">Danh mục</TableHead>
              <TableHead scope="col" className="text-right">Giá nhập</TableHead>
              <TableHead scope="col" className="text-right">Tối thiểu</TableHead>
              <TableHead scope="col" className="text-right">Tối đa</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col" className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chưa có nguyên liệu nào
                </TableCell>
              </TableRow>
            ) : (
              ingredients.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.sku ?? "-"}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.category ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {item.cost_price != null
                      ? formatPrice(item.cost_price)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.min_stock ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.max_stock ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Hoạt động" : "Ngưng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit Dialog */}
                      <Dialog
                        open={editingItem?.id === item.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setEditingItem(null);
                            setError(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setError(null);
                              setEditingItem(item);
                            }}
                            title="Sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Sửa nguyên liệu</DialogTitle>
                            <DialogDescription>
                              Cập nhật thông tin &quot;{item.name}&quot;
                            </DialogDescription>
                          </DialogHeader>
                          <IngredientForm
                            defaultValues={item}
                            onSubmit={(formData) =>
                              handleUpdate(item.id, formData)
                            }
                            isPending={isPending}
                            error={error}
                            submitLabel="Lưu"
                            pendingLabel="Đang lưu..."
                          />
                        </DialogContent>
                      </Dialog>

                      {/* Delete Dialog */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Xóa">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa nguyên liệu</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xóa &quot;{item.name}&quot;?
                              Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
