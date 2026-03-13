"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Zap, ToggleLeft, ToggleRight } from "lucide-react";
import {
  createEarnRule,
  updateEarnRule,
  deleteEarnRule,
  toggleEarnRule,
} from "./earn-rule-actions";
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
  Badge,
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
} from "@comtammatu/ui";

interface EarnRule {
  id: number;
  name: string;
  points_per_unit: number;
  unit_amount: number;
  min_order_total: number | null;
  is_active: boolean;
  tenant_id: number;
  created_at: string;
  updated_at: string;
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString("vi-VN") + "đ";
}

// --- Earn Rule Form ---

function EarnRuleForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
  submitLabel,
  pendingLabel,
}: {
  defaultValues?: EarnRule;
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
      <input
        type="hidden"
        name="is_active"
        value={defaultValues?.is_active !== false ? "true" : "false"}
      />
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Tên quy tắc *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            placeholder="VD: Tích điểm cơ bản"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="points_per_unit">Điểm tích *</Label>
            <Input
              id="points_per_unit"
              name="points_per_unit"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={defaultValues?.points_per_unit ?? 1}
              required
            />
            <p className="text-muted-foreground text-xs">
              Số điểm nhận được mỗi lần đạt mức chi tiêu
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unit_amount">Mức chi tiêu (VNĐ) *</Label>
            <Input
              id="unit_amount"
              name="unit_amount"
              type="number"
              min="1"
              step="1000"
              defaultValue={defaultValues?.unit_amount ?? 10000}
              required
            />
            <p className="text-muted-foreground text-xs">
              Mỗi bao nhiêu VNĐ thì tích 1 lần
            </p>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="min_order_total">Đơn tối thiểu (VNĐ)</Label>
          <Input
            id="min_order_total"
            name="min_order_total"
            type="number"
            min="0"
            step="1000"
            defaultValue={defaultValues?.min_order_total ?? ""}
            placeholder="0 = không giới hạn"
          />
          <p className="text-muted-foreground text-xs">
            Đơn hàng phải đạt giá trị tối thiểu mới được tích điểm
          </p>
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

export function EarnRulesTab({ earnRules }: { earnRules: EarnRule[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EarnRule | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createEarnRule(formData);
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
      const result = await updateEarnRule(id, formData);
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
      const result = await deleteEarnRule(id);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  function handleToggle(id: number) {
    startTransition(async () => {
      const result = await toggleEarnRule(id);
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
            Quy tắc tích điểm
          </h2>
          <p className="text-muted-foreground">
            Cấu hình quy tắc tự động tích điểm khi khách hàng thanh toán
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
              Thêm quy tắc
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm quy tắc tích điểm</DialogTitle>
              <DialogDescription>
                Tạo quy tắc mới để tự động tích điểm cho khách hàng khi đơn
                hàng hoàn thành
              </DialogDescription>
            </DialogHeader>
            <EarnRuleForm
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
                <TableHead scope="col">Tên quy tắc</TableHead>
                <TableHead scope="col" className="text-right">
                  Điểm / lần
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Mức chi tiêu
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Đơn tối thiểu
                </TableHead>
                <TableHead scope="col" className="text-center">
                  Trạng thái
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Zap className="text-muted-foreground/50 h-8 w-8" />
                      <p className="text-muted-foreground text-sm">
                        Chưa có quy tắc tích điểm nào
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Tạo quy tắc để tự động tích điểm khi khách thanh toán
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                earnRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-right">
                      {rule.points_per_unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(rule.unit_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {rule.min_order_total
                        ? formatPrice(rule.min_order_total)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(rule.id)}
                        disabled={isPending}
                        aria-label={
                          rule.is_active ? "Tắt quy tắc" : "Bật quy tắc"
                        }
                      >
                        {rule.is_active ? (
                          <Badge variant="default" className="gap-1">
                            <ToggleRight className="h-3 w-3" />
                            Đang bật
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <ToggleLeft className="h-3 w-3" />
                            Đã tắt
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Dialog */}
                        <Dialog
                          open={editingItem?.id === rule.id}
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
                                setEditingItem(rule);
                              }}
                              aria-label="Sửa"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sửa quy tắc tích điểm</DialogTitle>
                              <DialogDescription>
                                Cập nhật thông tin &quot;{rule.name}&quot;
                              </DialogDescription>
                            </DialogHeader>
                            <EarnRuleForm
                              defaultValues={rule}
                              onSubmit={(formData) =>
                                handleUpdate(rule.id, formData)
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
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Xóa"
                            >
                              <Trash2
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Xóa quy tắc tích điểm
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn xóa &quot;{rule.name}&quot;?
                                Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(rule.id)}
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

      {/* Info card explaining auto-earn */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Zap className="text-amber-500 mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Cách tích điểm tự động hoạt động</p>
              <p className="text-muted-foreground mt-1">
                Khi đơn hàng chuyển sang trạng thái &quot;Hoàn thành&quot; và có
                liên kết khách hàng, hệ thống sẽ tự động tính điểm theo các quy
                tắc đang bật. Điểm = ⌊Tổng đơn ÷ Mức chi tiêu⌋ × Điểm/lần.
                Điểm tích sẽ hết hạn sau 365 ngày.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
