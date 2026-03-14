"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import Link from "next/link";

import { createMenu, updateMenu, deleteMenu } from "./actions";
import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

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
    setError(null);
    startTransition(async () => {
      const result = await deleteMenu(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Thực đơn</h2>
          <p className="text-muted-foreground">Quản lý danh sách thực đơn của nhà hàng</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Thêm thực đơn
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>Tạo thực đơn mới</DialogTitle>
                <DialogDescription>Thêm thực đơn mới cho nhà hàng</DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên thực đơn</Label>
                  <Input id="name" name="name" placeholder="VD: Thực đơn chính" required />
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

      {error && !isCreateOpen && !editingMenu && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 p-3 text-sm text-red-600">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-4 font-medium underline hover:no-underline"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Tên thực đơn</TableHead>
              <TableHead scope="col">Loại</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col" className="text-right">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  Chưa có thực đơn nào
                </TableCell>
              </TableRow>
            ) : (
              menus.map((menu) => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium">{menu.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeLabels[menu.type] ?? menu.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={menu.is_active ? "default" : "secondary"}>
                      {menu.is_active ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild aria-label="Xem chi tiết">
                        <Link href={`/admin/menu/${menu.id}`}>
                          <Eye className="h-4 w-4" aria-hidden="true" />
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
                            aria-label="Sửa thực đơn"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <form action={(formData) => handleUpdate(menu.id, formData)}>
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
                                <Label htmlFor="edit-name">Tên thực đơn</Label>
                                <Input
                                  id="edit-name"
                                  name="name"
                                  defaultValue={menu.name}
                                  required
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-type">Loại</Label>
                                <Select name="type" defaultValue={menu.type}>
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
                              <div className="flex items-center gap-2">
                                <Switch
                                  id="edit-is_active"
                                  name="is_active_toggle"
                                  defaultChecked={menu.is_active}
                                  onCheckedChange={(checked) => {
                                    const hidden = document.getElementById(
                                      "edit-is_active-hidden"
                                    ) as HTMLInputElement;
                                    if (hidden) hidden.value = String(checked);
                                  }}
                                />
                                <input
                                  type="hidden"
                                  id="edit-is_active-hidden"
                                  name="is_active"
                                  defaultValue={String(menu.is_active)}
                                />
                                <Label htmlFor="edit-is_active">Hoạt động</Label>
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
                      <ConfirmDialog
                        title="Xóa thực đơn?"
                        description={`Thực đơn "${menu.name}" và tất cả danh mục, món ăn bên trong sẽ bị xóa vĩnh viễn.`}
                        onConfirm={() => handleDelete(menu.id)}
                        isPending={isPending}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Xóa thực đơn">
                            <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                          </Button>
                        }
                      />
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
