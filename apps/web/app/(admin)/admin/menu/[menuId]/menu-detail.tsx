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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  createCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../actions";

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  base_price: number;
  is_available: boolean;
  category_id: number;
  tenant_id: number;
  image_url: string | null;
  allergens: string[] | null;
  nutrition: unknown;
  prep_time_min: number | null;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  sort_order: number | null;
  items: MenuItem[];
}

interface Menu {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  tenant_id: number;
  created_at: string;
  updated_at: string;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

export function MenuDetail({
  menu,
  categories,
}: {
  menu: Menu;
  categories: Category[];
}) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [addItemCategoryId, setAddItemCategoryId] = useState<number | null>(
    null,
  );
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingItemCategoryId, setEditingItemCategoryId] = useState<
    number | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreateCategory(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCategory(formData);
      if (result?.error) setError(result.error);
      else setIsCategoryOpen(false);
    });
  }

  function handleDeleteCategory(id: number) {
    startTransition(async () => {
      await deleteCategory(id);
    });
  }

  function handleCreateItem(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createMenuItem(formData);
      if (result?.error) setError(result.error);
      else setAddItemCategoryId(null);
    });
  }

  function handleUpdateItem(id: number, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateMenuItem(id, formData);
      if (result?.error) setError(result.error);
      else {
        setEditingItem(null);
        setEditingItemCategoryId(null);
      }
    });
  }

  function handleDeleteItem(id: number) {
    startTransition(async () => {
      await deleteMenuItem(id);
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{menu.name}</h2>
          <p className="text-muted-foreground">
            Quản lý danh mục và món ăn trong thực đơn
          </p>
        </div>
        <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Thêm danh mục
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleCreateCategory}>
              <DialogHeader>
                <DialogTitle>Tạo danh mục mới</DialogTitle>
                <DialogDescription>
                  Thêm danh mục món ăn cho thực đơn
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <input type="hidden" name="menu_id" value={menu.id} />
                <div className="grid gap-2">
                  <Label htmlFor="cat-name">Tên danh mục</Label>
                  <Input
                    id="cat-name"
                    name="name"
                    placeholder="VD: Cơm"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cat-sort">Thứ tự</Label>
                  <Input
                    id="cat-sort"
                    name="sort_order"
                    type="number"
                    defaultValue="0"
                    min="0"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Đang tạo..." : "Tạo danh mục"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="bg-muted/50 flex h-40 items-center justify-center rounded-xl">
          <p className="text-muted-foreground">
            Chưa có danh mục nào. Hãy thêm danh mục đầu tiên.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category.id} className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <Badge variant="secondary">
                    {category.items.length} món
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {/* Add item to category */}
                  <Dialog
                    open={addItemCategoryId === category.id}
                    onOpenChange={(open) => {
                      if (!open) setAddItemCategoryId(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddItemCategoryId(category.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Thêm món
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form action={handleCreateItem}>
                        <DialogHeader>
                          <DialogTitle>Thêm món ăn</DialogTitle>
                          <DialogDescription>
                            Thêm món mới vào danh mục {category.name}
                          </DialogDescription>
                        </DialogHeader>
                        {error && (
                          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                            {error}
                          </div>
                        )}
                        <div className="grid gap-4 py-4">
                          <input
                            type="hidden"
                            name="category_id"
                            value={category.id}
                          />
                          <div className="grid gap-2">
                            <Label htmlFor="item-name">Tên món</Label>
                            <Input
                              id="item-name"
                              name="name"
                              placeholder="VD: Cơm Tấm Sườn Nướng"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="item-desc">Mô tả</Label>
                            <Textarea
                              id="item-desc"
                              name="description"
                              placeholder="Mô tả ngắn về món ăn"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="item-price">Giá (VND)</Label>
                            <Input
                              id="item-price"
                              name="base_price"
                              type="number"
                              min="1000"
                              step="1000"
                              placeholder="45000"
                              required
                            />
                          </div>
                          <input
                            type="hidden"
                            name="is_available"
                            value="true"
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={isPending}>
                            {isPending ? "Đang thêm..." : "Thêm món"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xóa danh mục?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Danh mục &quot;{category.name}&quot; và tất cả món
                          ăn bên trong sẽ bị xóa.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCategory(category.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Xóa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên món</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Giá</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {category.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground h-16 text-center"
                      >
                        Chưa có món ăn
                      </TableCell>
                    </TableRow>
                  ) : (
                    category.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {item.description ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(item.base_price)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.is_available ? "default" : "secondary"
                            }
                          >
                            {item.is_available ? "Có sẵn" : "Hết"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {/* Edit item */}
                            <Dialog
                              open={editingItem?.id === item.id}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setEditingItem(null);
                                  setEditingItemCategoryId(null);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setEditingItemCategoryId(category.id);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <form
                                  action={(formData) =>
                                    handleUpdateItem(item.id, formData)
                                  }
                                >
                                  <DialogHeader>
                                    <DialogTitle>Sửa món ăn</DialogTitle>
                                  </DialogHeader>
                                  {error && (
                                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                                      {error}
                                    </div>
                                  )}
                                  <div className="grid gap-4 py-4">
                                    <input
                                      type="hidden"
                                      name="category_id"
                                      value={editingItemCategoryId ?? ""}
                                    />
                                    <div className="grid gap-2">
                                      <Label>Tên món</Label>
                                      <Input
                                        name="name"
                                        defaultValue={item.name}
                                        required
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Mô tả</Label>
                                      <Textarea
                                        name="description"
                                        defaultValue={
                                          item.description ?? ""
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Giá (VND)</Label>
                                      <Input
                                        name="base_price"
                                        type="number"
                                        min="1000"
                                        step="1000"
                                        defaultValue={item.base_price}
                                        required
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        name="is_available_toggle"
                                        defaultChecked={item.is_available}
                                        onCheckedChange={(checked) => {
                                          const h =
                                            document.getElementById(
                                              `avail-${item.id}`,
                                            ) as HTMLInputElement;
                                          if (h)
                                            h.value = String(checked);
                                        }}
                                      />
                                      <input
                                        type="hidden"
                                        id={`avail-${item.id}`}
                                        name="is_available"
                                        defaultValue={String(
                                          item.is_available,
                                        )}
                                      />
                                      <Label>Có sẵn</Label>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      type="submit"
                                      disabled={isPending}
                                    >
                                      {isPending ? "Đang lưu..." : "Lưu"}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Xóa món ăn?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Món &quot;{item.name}&quot; sẽ bị xóa
                                    vĩnh viễn.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteItem(item.id)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
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
          ))}
        </div>
      )}
    </div>
  );
}
