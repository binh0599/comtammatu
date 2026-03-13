"use client";

import { useState, useTransition } from "react";
import {
  getLoyaltyTransactionTypeLabel,
  LOYALTY_TRANSACTION_TYPES,
} from "@comtammatu/shared";
import { adjustLoyaltyPoints } from "./actions";
import type { Customer } from "./crm-types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@comtammatu/ui";

export function AdjustPointsDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("earn");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const pointsRaw = Number(formData.get("points"));
    const referenceType = (formData.get("reference_type") as string) || undefined;

    // For redeem type, points should be negative
    const points = type === "redeem" ? -Math.abs(pointsRaw) : Math.abs(pointsRaw);

    startTransition(async () => {
      const result = await adjustLoyaltyPoints({
        customer_id: customer.id,
        points,
        type,
        reference_type: referenceType,
      });
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
        setError(null);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) {
          setError(null);
          setType("earn");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Điều chỉnh điểm — {customer.full_name}</DialogTitle>
          <DialogDescription>
            Thêm hoặc trừ điểm thưởng cho khách hàng
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {error && (
            <div id="points-adjust-error" role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Loại giao dịch</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOYALTY_TRANSACTION_TYPES.filter(
                    (t) => t !== "expire"
                  ).map((t) => (
                    <SelectItem key={t} value={t}>
                      {getLoyaltyTransactionTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="points">Số điểm</Label>
              <Input
                id="points"
                name="points"
                type="number"
                min="1"
                placeholder="VD: 100"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reference_type">Lý do (tùy chọn)</Label>
              <Input
                id="reference_type"
                name="reference_type"
                placeholder="VD: Mua hang, Khuyen mai"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
