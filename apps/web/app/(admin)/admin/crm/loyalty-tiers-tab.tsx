"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Crown } from "lucide-react";
import {
  createLoyaltyTier,
  updateLoyaltyTier,
  deleteLoyaltyTier,
} from "./actions";
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
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@comtammatu/ui";

// Match Supabase Json type without importing from database package (client component)
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

interface LoyaltyTier {
  id: number;
  name: string;
  min_points: number;
  discount_pct: number | null;
  benefits: Json | null;
  sort_order: number | null;
  tenant_id: number;
  created_at: string;
}

function formatBenefits(benefits: Json | null): string {
  if (benefits == null) return "-";
  if (typeof benefits === "string") return benefits;
  if (Array.isArray(benefits)) return benefits.join(", ");
  return JSON.stringify(benefits);
}

// --- Tier Form ---

function TierForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
  submitLabel,
  pendingLabel,
}: {
  defaultValues?: LoyaltyTier;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
  pendingLabel: string;
}) {
  return (
    <form action={onSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Tên hạng *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            placeholder="VD: Bac, Vang, Kim cuong"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="min_points">Điểm tối thiểu *</Label>
            <Input
              id="min_points"
              name="min_points"
              type="number"
              min="0"
              defaultValue={defaultValues?.min_points ?? 0}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="discount_pct">Giảm giá (%)</Label>
            <Input
              id="discount_pct"
              name="discount_pct"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={defaultValues?.discount_pct ?? ""}
              placeholder="VD: 5"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sort_order">Thứ tự sắp xếp</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            min="1"
            defaultValue={defaultValues?.sort_order ?? ""}
            placeholder="VD: 1, 2, 3"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="benefits">Quyền lợi</Label>
          <Textarea
            id="benefits"
            name="benefits"
            defaultValue={formatBenefits(defaultValues?.benefits ?? null)}
            placeholder="VD: Giam 5% moi don, Uu tien cho ngoi, Tang nuoc mien phi"
            rows={3}
          />
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

// --- Main Component ---

export function LoyaltyTiersTab({
  loyaltyTiers,
}: {
  loyaltyTiers: LoyaltyTier[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LoyaltyTier | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createLoyaltyTier(formData);
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
      const result = await updateLoyaltyTier(id, formData);
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
      const result = await deleteLoyaltyTier(id);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Hạng thành viên
          </h2>
          <p className="text-muted-foreground">
            Quản lý các hạng thành viên và quyền lợi tương ứng
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
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Thêm hạng
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm hạng thành viên</DialogTitle>
              <DialogDescription>
                Tạo hạng thành viên mới cho chương trình khách hàng thân thiết
              </DialogDescription>
            </DialogHeader>
            <TierForm
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

      <Card>
        <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Tên hạng</TableHead>
              <TableHead scope="col" className="text-right">Điểm tối thiểu</TableHead>
              <TableHead scope="col" className="text-right">Giảm giá %</TableHead>
              <TableHead scope="col">Quyền lợi</TableHead>
              <TableHead scope="col" className="text-right">Thứ tự</TableHead>
              <TableHead scope="col" className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loyaltyTiers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Crown className="text-muted-foreground/50 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                      Chưa có hạng thành viên nào
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              loyaltyTiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">{tier.name}</TableCell>
                  <TableCell className="text-right">
                    {tier.min_points.toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    {tier.discount_pct != null ? `${tier.discount_pct}%` : "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {formatBenefits(tier.benefits)}
                  </TableCell>
                  <TableCell className="text-right">
                    {tier.sort_order ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit Dialog */}
                      <Dialog
                        open={editingItem?.id === tier.id}
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
                              setEditingItem(tier);
                            }}
                            aria-label="Sửa"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Sửa hạng thành viên</DialogTitle>
                            <DialogDescription>
                              Cập nhật thông tin &quot;{tier.name}&quot;
                            </DialogDescription>
                          </DialogHeader>
                          <TierForm
                            defaultValues={tier}
                            onSubmit={(formData) =>
                              handleUpdate(tier.id, formData)
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
                          <Button variant="ghost" size="icon" aria-label="Xóa">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Xóa hạng thành viên
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xóa &quot;{tier.name}&quot;?
                              Hành động này không thể hoàn tác. Nếu có khách
                              hàng đang ở hạng này, bạn không thể xóa.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(tier.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}
