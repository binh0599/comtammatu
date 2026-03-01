"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Power, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  createKdsStation,
  updateKdsStation,
  toggleKdsStation,
  deleteKdsStation,
} from "./actions";

interface KdsStation {
  id: number;
  name: string;
  branch_id: number;
  is_active: boolean;
  created_at: string;
  branches: { tenant_id: number; name: string };
  kds_station_categories: {
    category_id: number;
    menu_categories: { id: number; name: string } | null;
  }[];
}

interface Branch {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  menu_id: number;
}

function CategorySelector({
  categories,
  selectedIds,
  onChange,
}: {
  categories: Category[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  function handleToggle(id: number, checked: boolean) {
    if (checked) {
      onChange([...selectedIds, id]);
    } else {
      onChange(selectedIds.filter((cid) => cid !== id));
    }
  }

  return (
    <div className="grid gap-2">
      <Label>Danh mục món ăn</Label>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Chưa có danh mục nào
          </p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${cat.id}`}
                checked={selectedIds.includes(cat.id)}
                onCheckedChange={(checked) =>
                  handleToggle(cat.id, checked === true)
                }
              />
              <label
                htmlFor={`cat-${cat.id}`}
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {cat.name}
              </label>
            </div>
          ))
        )}
      </div>
      {selectedIds.length === 0 && (
        <p className="text-sm text-red-500">Phải chọn ít nhất 1 danh mục</p>
      )}
    </div>
  );
}

export function StationsTable({
  stations,
  branches,
  categories,
}: {
  stations: KdsStation[];
  branches: Branch[];
  categories: Category[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<KdsStation | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  function resetForm() {
    setError(null);
    setSelectedCategoryIds([]);
  }

  function handleCreate(formData: FormData) {
    if (selectedCategoryIds.length === 0) {
      setError("Phải chọn ít nhất 1 danh mục");
      return;
    }
    setError(null);
    formData.set("category_ids", selectedCategoryIds.join(","));
    startTransition(async () => {
      const result = await createKdsStation(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        resetForm();
        setIsCreateOpen(false);
      }
    });
  }

  function handleUpdate(id: number, formData: FormData) {
    if (selectedCategoryIds.length === 0) {
      setError("Phải chọn ít nhất 1 danh mục");
      return;
    }
    setError(null);
    formData.set("category_ids", selectedCategoryIds.join(","));
    startTransition(async () => {
      const result = await updateKdsStation(id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        resetForm();
        setEditingStation(null);
      }
    });
  }

  function handleToggle(id: number) {
    startTransition(async () => {
      const result = await toggleKdsStation(id);
      if (result?.error) setError(result.error);
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteKdsStation(id);
      if (result?.error) setError(result.error);
    });
  }

  function openEditDialog(station: KdsStation) {
    setError(null);
    setSelectedCategoryIds(
      station.kds_station_categories.map((sc) => sc.category_id)
    );
    setEditingStation(station);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bếp KDS</h2>
          <p className="text-muted-foreground">
            Quản lý các bếp hiển thị đơn hàng (Kitchen Display Station)
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
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Thêm bếp KDS
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Thêm bếp KDS</DialogTitle>
                <DialogDescription>
                  Tạo bếp KDS mới và gán danh mục món ăn
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên bếp</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="VD: Bếp Chính"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="branch_id">Chi nhánh</Label>
                  <Select name="branch_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chi nhánh" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem
                          key={branch.id}
                          value={String(branch.id)}
                        >
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <CategorySelector
                  categories={categories}
                  selectedIds={selectedCategoryIds}
                  onChange={setSelectedCategoryIds}
                />
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
                  {isPending ? "Đang tạo..." : "Tạo bếp"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateOpen && !editingStation && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên bếp</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Chưa có bếp KDS nào
                </TableCell>
              </TableRow>
            ) : (
              stations.map((station) => (
                <TableRow key={station.id}>
                  <TableCell className="font-medium">
                    {station.name}
                  </TableCell>
                  <TableCell>{station.branches.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {station.kds_station_categories.map((sc) => (
                        <Badge key={sc.category_id} variant="outline">
                          {sc.menu_categories?.name ?? `#${sc.category_id}`}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={station.is_active ? "default" : "secondary"}
                    >
                      {station.is_active ? "Hoạt động" : "Tắt"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit Dialog */}
                      <Dialog
                        open={editingStation?.id === station.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setEditingStation(null);
                            resetForm();
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(station)}
                            title="Sửa bếp"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <form
                            action={(formData) =>
                              handleUpdate(station.id, formData)
                            }
                          >
                            <DialogHeader>
                              <DialogTitle>Sửa bếp KDS</DialogTitle>
                              <DialogDescription>
                                Cập nhật thông tin bếp &quot;{station.name}&quot;
                              </DialogDescription>
                            </DialogHeader>
                            {error && (
                              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                                {error}
                              </div>
                            )}
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-name">Tên bếp</Label>
                                <Input
                                  id="edit-name"
                                  name="name"
                                  defaultValue={station.name}
                                  required
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-branch">Chi nhánh</Label>
                                <Select
                                  name="branch_id"
                                  defaultValue={String(station.branch_id)}
                                  required
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {branches.map((branch) => (
                                      <SelectItem
                                        key={branch.id}
                                        value={String(branch.id)}
                                      >
                                        {branch.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <CategorySelector
                                categories={categories}
                                selectedIds={selectedCategoryIds}
                                onChange={setSelectedCategoryIds}
                              />
                            </div>
                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setEditingStation(null);
                                  resetForm();
                                }}
                              >
                                Hủy
                              </Button>
                              <Button type="submit" disabled={isPending}>
                                {isPending ? "Đang lưu..." : "Lưu"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(station.id)}
                        disabled={isPending}
                        title={
                          station.is_active ? "Tắt bếp" : "Bật bếp"
                        }
                      >
                        <Power className="h-4 w-4" />
                      </Button>

                      {/* Delete Dialog */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xóa bếp"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa bếp KDS</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xóa bếp &quot;{station.name}
                              &quot;? Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(station.id)}
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
