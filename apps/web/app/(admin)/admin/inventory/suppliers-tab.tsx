"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
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
import { createSupplier, updateSupplier, deleteSupplier } from "./actions";

interface Supplier {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms: string | null;
  rating: number | null;
  is_active: boolean;
  tenant_id: number;
  created_at: string;
  updated_at: string;
}

function RatingDisplay({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
            }`}
        />
      ))}
    </div>
  );
}

function SupplierForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
  submitLabel,
  pendingLabel,
}: {
  defaultValues?: Supplier;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [rating, setRating] = useState<string>(
    defaultValues?.rating?.toString() ?? ""
  );

  return (
    <form action={onSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Tên nhà cung cấp *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            placeholder="VD: Công ty TNHH Thực phẩm ABC"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="contact_name">Người liên hệ</Label>
            <Input
              id="contact_name"
              name="contact_name"
              defaultValue={defaultValues?.contact_name ?? ""}
              placeholder="Tên người liên hệ"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={defaultValues?.phone ?? ""}
              placeholder="VD: 0901234567"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaultValues?.email ?? ""}
              placeholder="VD: lienhe@abc.vn"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment_terms">Điều khoản thanh toán</Label>
            <Input
              id="payment_terms"
              name="payment_terms"
              defaultValue={defaultValues?.payment_terms ?? ""}
              placeholder="VD: Net 30, COD"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="address">Địa chỉ</Label>
          <Input
            id="address"
            name="address"
            defaultValue={defaultValues?.address ?? ""}
            placeholder="Địa chỉ nhà cung cấp"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rating">Đánh giá</Label>
          <Select
            value={rating}
            onValueChange={setRating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn đánh giá" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 sao</SelectItem>
              <SelectItem value="2">2 sao</SelectItem>
              <SelectItem value="3">3 sao</SelectItem>
              <SelectItem value="4">4 sao</SelectItem>
              <SelectItem value="5">5 sao</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="rating" value={rating} />
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

export function SuppliersTab({ suppliers }: { suppliers: Supplier[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createSupplier(formData);
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
      const result = await updateSupplier(id, formData);
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
      const result = await deleteSupplier(id);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nhà cung cấp</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách nhà cung cấp nguyên liệu
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
              Thêm NCC
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm nhà cung cấp</DialogTitle>
              <DialogDescription>
                Tạo nhà cung cấp mới cho nhà hàng
              </DialogDescription>
            </DialogHeader>
            <SupplierForm
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
              <TableHead scope="col">Liên hệ</TableHead>
              <TableHead scope="col">SĐT</TableHead>
              <TableHead scope="col">Email</TableHead>
              <TableHead scope="col">Điều khoản TT</TableHead>
              <TableHead scope="col">Đánh giá</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col" className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chưa có nhà cung cấp nào
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.contact_name ?? "-"}</TableCell>
                  <TableCell>{item.phone ?? "-"}</TableCell>
                  <TableCell>{item.email ?? "-"}</TableCell>
                  <TableCell>{item.payment_terms ?? "-"}</TableCell>
                  <TableCell>
                    <RatingDisplay rating={item.rating} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Hoạt động" : "Tạm dừng"}
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
                            <DialogTitle>Sửa nhà cung cấp</DialogTitle>
                            <DialogDescription>
                              Cập nhật thông tin &quot;{item.name}&quot;
                            </DialogDescription>
                          </DialogHeader>
                          <SupplierForm
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
                            <AlertDialogTitle>
                              Xóa nhà cung cấp
                            </AlertDialogTitle>
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
