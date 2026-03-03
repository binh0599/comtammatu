"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import {
  getCustomerGenderLabel,
  getCustomerSourceLabel,
  CUSTOMER_GENDERS,
  CUSTOMER_SOURCES,
} from "@comtammatu/shared";
import type { Customer, LoyaltyTier } from "./crm-types";

export function CustomerForm({
  defaultValues,
  loyaltyTiers,
  onSubmit,
  isPending,
  error,
  submitLabel,
  pendingLabel,
  showTierField,
}: {
  defaultValues?: Customer;
  loyaltyTiers: LoyaltyTier[];
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
  pendingLabel: string;
  showTierField?: boolean;
}) {
  const [gender, setGender] = useState(defaultValues?.gender ?? "");
  const [source, setSource] = useState(defaultValues?.source ?? "");
  const [tierId, setTierId] = useState(
    defaultValues?.loyalty_tier_id?.toString() ?? ""
  );

  return (
    <form action={onSubmit}>
      {error && (
        <div id="form-error" role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="full_name">Họ tên *</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={defaultValues?.full_name}
            placeholder="VD: Nguyen Van A"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">Số điện thoại *</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={defaultValues?.phone}
              placeholder="VD: 0901234567"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaultValues?.email ?? ""}
              placeholder="VD: email@example.com"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="gender">Giới tính</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn giới tính" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {getCustomerGenderLabel(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="gender" value={gender} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="birthday">Ngày sinh</Label>
            <Input
              id="birthday"
              name="birthday"
              type="date"
              defaultValue={defaultValues?.birthday ?? ""}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="source">Nguồn</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn nguồn" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getCustomerSourceLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="source" value={source} />
          </div>
          {showTierField && (
            <div className="grid gap-2">
              <Label htmlFor="loyalty_tier_id">Hạng thành viên</Label>
              <Select value={tierId} onValueChange={setTierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn hạng" />
                </SelectTrigger>
                <SelectContent>
                  {loyaltyTiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id.toString()}>
                      {tier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="loyalty_tier_id" value={tierId} />
            </div>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">Ghi chú</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={defaultValues?.notes ?? ""}
            placeholder="Ghi chú về khách hàng"
            rows={2}
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
