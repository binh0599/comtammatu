"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatPrice,
  formatDate,
  getVoucherTypeLabel,
  VOUCHER_TYPES,
} from "@comtammatu/shared";
import { cn } from "@/lib/utils";
import {
  createVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucher,
} from "./actions";

interface Branch {
  id: number;
  name: string;
}

interface VoucherBranch {
  branch_id: number;
  branches: { name: string } | null;
}

interface Voucher {
  id: number;
  code: string;
  type: string;
  value: number;
  min_order: number | null;
  max_discount: number | null;
  valid_from: string;
  valid_to: string;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  tenant_id: number;
  created_at: string;
  voucher_branches: VoucherBranch[];
}

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case "percent":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "fixed":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "free_item":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    default:
      return "";
  }
}

function formatVoucherValue(type: string, value: number): string {
  switch (type) {
    case "percent":
      return `${value}%`;
    case "fixed":
      return formatPrice(value);
    case "free_item":
      return `${value} mon`;
    default:
      return String(value);
  }
}

// --- Voucher Form ---

function VoucherForm({
  defaultValues,
  branches,
  onSubmit,
  isPending,
  error,
  submitLabel,
  pendingLabel,
}: {
  defaultValues?: Voucher;
  branches: Branch[];
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [type, setType] = useState(defaultValues?.type ?? "percent");
  const [selectedBranches, setSelectedBranches] = useState<number[]>(
    defaultValues?.voucher_branches.map((vb) => vb.branch_id) ?? []
  );

  function handleToggleBranch(branchId: number) {
    setSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    onSubmit({
      code: formData.get("code") as string,
      type,
      value: Number(formData.get("value")),
      min_order: formData.get("min_order")
        ? Number(formData.get("min_order"))
        : null,
      max_discount: formData.get("max_discount")
        ? Number(formData.get("max_discount"))
        : null,
      valid_from: formData.get("valid_from") as string,
      valid_to: formData.get("valid_to") as string,
      max_uses: formData.get("max_uses")
        ? Number(formData.get("max_uses"))
        : null,
      is_active: true,
      branch_ids: selectedBranches,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="code">Ma voucher *</Label>
            <Input
              id="code"
              name="code"
              defaultValue={defaultValues?.code}
              placeholder="VD: SALE2026"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Loai *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOUCHER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {getVoucherTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="value">
              Gia tri *{" "}
              {type === "percent" ? "(%)" : type === "fixed" ? "(VND)" : ""}
            </Label>
            <Input
              id="value"
              name="value"
              type="number"
              min="0"
              step={type === "percent" ? "0.1" : "1000"}
              defaultValue={defaultValues?.value ?? ""}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="min_order">Don toi thieu</Label>
            <Input
              id="min_order"
              name="min_order"
              type="number"
              min="0"
              step="1000"
              defaultValue={defaultValues?.min_order ?? ""}
              placeholder="0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="max_discount">Giam toi da</Label>
            <Input
              id="max_discount"
              name="max_discount"
              type="number"
              min="0"
              step="1000"
              defaultValue={defaultValues?.max_discount ?? ""}
              placeholder="0"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="valid_from">Tu ngay *</Label>
            <Input
              id="valid_from"
              name="valid_from"
              type="date"
              defaultValue={
                defaultValues?.valid_from
                  ? defaultValues.valid_from.split("T")[0]
                  : ""
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="valid_to">Den ngay *</Label>
            <Input
              id="valid_to"
              name="valid_to"
              type="date"
              defaultValue={
                defaultValues?.valid_to
                  ? defaultValues.valid_to.split("T")[0]
                  : ""
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="max_uses">So lan dung</Label>
            <Input
              id="max_uses"
              name="max_uses"
              type="number"
              min="1"
              defaultValue={defaultValues?.max_uses ?? ""}
              placeholder="Khong gioi han"
            />
          </div>
        </div>
        {branches.length > 0 && (
          <div className="grid gap-2">
            <Label>Chi nhanh ap dung</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
              {branches.map((branch) => (
                <div key={branch.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`branch-${branch.id}`}
                    checked={selectedBranches.includes(branch.id)}
                    onCheckedChange={() => handleToggleBranch(branch.id)}
                  />
                  <label
                    htmlFor={`branch-${branch.id}`}
                    className="cursor-pointer text-sm"
                  >
                    {branch.name}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Khong chon = ap dung tat ca chi nhanh
            </p>
          </div>
        )}
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

export function VouchersTab({
  vouchers,
  branches,
}: {
  vouchers: Voucher[];
  branches: Branch[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Voucher | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(data: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const result = await createVoucher(
        data as Parameters<typeof createVoucher>[0]
      );
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setIsCreateOpen(false);
        setError(null);
      }
    });
  }

  function handleUpdate(id: number, data: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const result = await updateVoucher(
        id,
        data as Parameters<typeof updateVoucher>[1]
      );
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
      const result = await deleteVoucher(id);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  function handleToggle(id: number) {
    startTransition(async () => {
      const result = await toggleVoucher(id);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Voucher</h2>
          <p className="text-muted-foreground">
            Quan ly ma giam gia va khuyen mai
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
              Them voucher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Them voucher</DialogTitle>
              <DialogDescription>
                Tao ma giam gia moi cho khach hang
              </DialogDescription>
            </DialogHeader>
            <VoucherForm
              branches={branches}
              onSubmit={handleCreate}
              isPending={isPending}
              error={error}
              submitLabel="Tao"
              pendingLabel="Dang tao..."
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
              <TableHead>Ma</TableHead>
              <TableHead>Loai</TableHead>
              <TableHead className="text-right">Gia tri</TableHead>
              <TableHead className="text-right">Don toi thieu</TableHead>
              <TableHead className="text-right">Giam toi da</TableHead>
              <TableHead>Hieu luc</TableHead>
              <TableHead>Chi nhanh</TableHead>
              <TableHead>Trang thai</TableHead>
              <TableHead className="text-right">Thao tac</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co voucher nao
                </TableCell>
              </TableRow>
            ) : (
              vouchers.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-mono font-medium">
                    {voucher.code}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(getTypeBadgeClass(voucher.type))}
                    >
                      {getVoucherTypeLabel(voucher.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVoucherValue(voucher.type, voucher.value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {voucher.min_order != null
                      ? formatPrice(voucher.min_order)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {voucher.max_discount != null
                      ? formatPrice(voucher.max_discount)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(voucher.valid_from)} -{" "}
                    {formatDate(voucher.valid_to)}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-sm">
                    {voucher.voucher_branches.length === 0
                      ? "Tat ca"
                      : voucher.voucher_branches
                          .map((vb) => vb.branches?.name ?? "")
                          .filter(Boolean)
                          .join(", ")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={voucher.is_active ? "default" : "secondary"}
                    >
                      {voucher.is_active ? "Hoat dong" : "Tam dung"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Toggle Active */}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={
                          voucher.is_active ? "Tam dung" : "Kich hoat"
                        }
                        onClick={() => handleToggle(voucher.id)}
                      >
                        {voucher.is_active ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>

                      {/* Edit Dialog */}
                      <Dialog
                        open={editingItem?.id === voucher.id}
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
                              setEditingItem(voucher);
                            }}
                            title="Sua"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Sua voucher</DialogTitle>
                            <DialogDescription>
                              Cap nhat thong tin &quot;{voucher.code}&quot;
                            </DialogDescription>
                          </DialogHeader>
                          <VoucherForm
                            defaultValues={voucher}
                            branches={branches}
                            onSubmit={(data) =>
                              handleUpdate(voucher.id, data)
                            }
                            isPending={isPending}
                            error={error}
                            submitLabel="Luu"
                            pendingLabel="Dang luu..."
                          />
                        </DialogContent>
                      </Dialog>

                      {/* Delete Dialog */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Xoa">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xoa voucher</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ban co chac muon xoa voucher &quot;{voucher.code}
                              &quot;? Hanh dong nay khong the hoan tac.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Huy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(voucher.id)}
                            >
                              Xoa
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
