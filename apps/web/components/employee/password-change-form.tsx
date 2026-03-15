"use client";

import { useTransition, useState } from "react";
import { changeMyPassword } from "@/app/(employee)/employee/actions";
import { toast } from "sonner";
import { Button, Input, Label } from "@comtammatu/ui";

interface PasswordChangeFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function PasswordChangeForm({ onCancel, onSuccess }: PasswordChangeFormProps) {
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await changeMyPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã đổi mật khẩu thành công");
        onSuccess();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
        <Input
          id="current_password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <div>
        <Label htmlFor="new_password">Mật khẩu mới</Label>
        <Input
          id="new_password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          placeholder="Tối thiểu 8 ký tự"
        />
      </div>
      <div>
        <Label htmlFor="confirm_password">Xác nhận mật khẩu</Label>
        <Input
          id="confirm_password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Đang đổi..." : "Đổi mật khẩu"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Hủy
        </Button>
      </div>
    </form>
  );
}
