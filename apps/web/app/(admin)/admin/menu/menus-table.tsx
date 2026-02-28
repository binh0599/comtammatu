"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import Link from "next/link";

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
import { Switch } from "@/components/ui/switch";
import { createMenu, updateMenu, deleteMenu } from "./actions";

interface Menu {
  id: number;
  tenant_id: number;
  name: string;
  type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const typeLabels: Record<string, string> = {
  dine_in: "Tại quán",
  takeaway: "Mang đi",
  delivery: "Giao hàng",
};

export function MenusTable({ menus }: { menus: Menu[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createMenu(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsCreateOpen(false);
      }
    });
  }

  function handleUpdate(id: number, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateMenu(id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setEditingMenu(null);
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteMenu(id);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Thực đơn</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách thực đơn của nhà hàng
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Thêm thực đơn
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Tạo thực đơn mới</DialogTitle>
                <DialogDescription>
                  Thêm thực đơn mới cho nhà hàng
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên thực đơn</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="VD: Thực đơn chính"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Loại</Label>
                  <Select name="type" defaultValue="dine_in">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dine_in">Tại quán</SelectItem>
                      <SelectItem value="takeaway">Mang đi</SelectItem>
                      <SelectItem value="delivery">Giao hàng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <input type="hidden" name="is_active" value="true" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Đang tạo..." : "Tạo thực đơn"}
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
              <TableHead>Tên thực đơn</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menus.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chưa có thực đơn nào
                </TableCell>
              </TableRow>
            ) : (
              menus.map((menu) => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium">{menu.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {typeLabels[menu.type] ?? menu.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={menu.is_active ? "default" : "secondary"}
                    >
                      {menu.is_active ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/menu/${menu.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>

                      {/* Edit Dialog */}
                      <Dialog
                        open={editingMenu?.id === menu.id}
                        onOpenChange={(open) => {
                          if (!open) setEditingMenu(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingMenu(menu)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <form
                            action={(formData) =>
                              handleUpdate(menu.id, formData)
                            }
                          >
                            <DialogHeader>
                              <DialogTitle>Sửa thực đơn</DialogTitle>
                            </DialogHeader>
                            {error && (
                              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                                {error}
                              </div>
                            )}
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-name">
                                  Tên thực đơn
                                </Label>
                                <Input
                                  id="edit-name"
                                  name="name"
                                  defaultValue={menu.name}
                                  required
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-type">Loại</Label>
                                <Select
                                  name="type"
                                  defaultValue={menu.type}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="dine_in">
                                      Tại quán
                                    </SelectItem>
                                    <SelectItem value="takeaway">
                                      Mang đi
                                    </SelectItem>
                                    <SelectItem value="delivery">
                                      Giao hàng
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id="edit-is_active"
                                  name="is_active_toggle"
                                  defaultChecked={menu.is_active}
                                  onCheckedChange={(checked) => {
                                    const hidden =
                                      document.getElementById(
                                        "edit-is_active-hidden",
                                      ) as HTMLInputElement;
                                    if (hidden)
                                      hidden.value = String(checked);
                                  }}
                                />
                                <input
                                  type="hidden"
                                  id="edit-is_active-hidden"
                                  name="is_active"
                                  defaultValue={String(menu.is_active)}
                                />
                                <Label htmlFor="edit-is_active">
                                  Hoạt động
                                </Label>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="submit" disabled={isPending}>
                                {isPending ? "Đang lưu..." : "Lưu"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>

                      {/* Delete Dialog */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Xóa thực đơn?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Thực đơn &quot;{menu.name}&quot; và tất cả danh
                              mục, món ăn bên trong sẽ bị xóa vĩnh viễn.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(menu.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {isPending ? "Đang xóa..." : "Xóa"}
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
