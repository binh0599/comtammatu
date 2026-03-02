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
import {
  createLoyaltyTier,
  updateLoyaltyTier,
  deleteLoyaltyTier,
} from "./actions";

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
          <Label htmlFor="name">Ten hang *</Label>
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
            <Label htmlFor="min_points">Diem toi thieu *</Label>
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
            <Label htmlFor="discount_pct">Giam gia (%)</Label>
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
          <Label htmlFor="sort_order">Thu tu sap xep</Label>
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
          <Label htmlFor="benefits">Quyen loi</Label>
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
            Hang thanh vien
          </h2>
          <p className="text-muted-foreground">
            Quan ly cac hang thanh vien va quyen loi tuong ung
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
              Them hang
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Them hang thanh vien</DialogTitle>
              <DialogDescription>
                Tao hang thanh vien moi cho chuong trinh khach hang than thiet
              </DialogDescription>
            </DialogHeader>
            <TierForm
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
              <TableHead>Ten hang</TableHead>
              <TableHead className="text-right">Diem toi thieu</TableHead>
              <TableHead className="text-right">Giam gia %</TableHead>
              <TableHead>Quyen loi</TableHead>
              <TableHead className="text-right">Thu tu</TableHead>
              <TableHead className="text-right">Thao tac</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loyaltyTiers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co hang thanh vien nao
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
                            title="Sua"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Sua hang thanh vien</DialogTitle>
                            <DialogDescription>
                              Cap nhat thong tin &quot;{tier.name}&quot;
                            </DialogDescription>
                          </DialogHeader>
                          <TierForm
                            defaultValues={tier}
                            onSubmit={(formData) =>
                              handleUpdate(tier.id, formData)
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
                            <AlertDialogTitle>
                              Xoa hang thanh vien
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Ban co chac muon xoa &quot;{tier.name}&quot;?
                              Hanh dong nay khong the hoan tac. Neu co khach
                              hang dang o hang nay, ban khong the xoa.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Huy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(tier.id)}
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
