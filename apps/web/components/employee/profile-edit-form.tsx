"use client";

import { useTransition, useState } from "react";
import { updateMyProfile } from "@/app/(employee)/employee/actions";
import { toast } from "sonner";
import { Button, Input, Label, Separator } from "@comtammatu/ui";

interface EmergencyContact {
  name?: string | null;
  phone?: string | null;
  relationship?: string | null;
}

interface ProfileEditFormProps {
  initialName: string;
  initialEc: EmergencyContact | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ProfileEditForm({
  initialName,
  initialEc,
  onCancel,
  onSuccess,
}: ProfileEditFormProps) {
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initialName);
  const [ecName, setEcName] = useState(initialEc?.name ?? "");
  const [ecPhone, setEcPhone] = useState(initialEc?.phone ?? "");
  const [ecRelationship, setEcRelationship] = useState(initialEc?.relationship ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateMyProfile({
        full_name: fullName,
        emergency_contact: {
          name: ecName || undefined,
          phone: ecPhone || undefined,
          relationship: ecRelationship || undefined,
        },
      });

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã cập nhật thông tin");
        onSuccess();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="full_name">Họ tên</Label>
        <Input
          id="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
        />
      </div>

      <Separator />
      <p className="text-sm font-medium">Liên hệ khẩn cấp</p>

      <div>
        <Label htmlFor="ec_name">Tên người liên hệ</Label>
        <Input id="ec_name" value={ecName} onChange={(e) => setEcName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="ec_phone">Số điện thoại</Label>
        <Input id="ec_phone" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="ec_relationship">Quan hệ</Label>
        <Input
          id="ec_relationship"
          value={ecRelationship}
          onChange={(e) => setEcRelationship(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Hủy
        </Button>
      </div>
    </form>
  );
}
