"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { getLeaveTypeLabel, LEAVE_TYPES } from "@comtammatu/shared";
import { createMyLeaveRequest } from "@/app/(employee)/employee/actions";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
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
} from "@comtammatu/ui";

export function CreateLeaveDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [leaveType, setLeaveType] = useState<string>("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const startDate = formData.get("start_date") as string;
    const endDate = formData.get("end_date") as string;

    if (endDate < startDate) {
      toast.error("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    startTransition(async () => {
      const result = await createMyLeaveRequest({
        type: leaveType as "annual" | "sick" | "unpaid" | "maternity",
        start_date: startDate,
        end_date: endDate,
        days,
        reason: (formData.get("reason") as string) || "",
      });

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã gửi yêu cầu nghỉ phép");
        setOpen(false);
        setLeaveType("");
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Xin nghỉ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gửi yêu cầu nghỉ phép</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label>Loại nghỉ</Label>
            <Select value={leaveType} onValueChange={setLeaveType} required>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại nghỉ" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {getLeaveTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start_date">Từ ngày</Label>
              <Input type="date" id="start_date" name="start_date" required />
            </div>
            <div>
              <Label htmlFor="end_date">Đến ngày</Label>
              <Input type="date" id="end_date" name="end_date" required />
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Lý do (tùy chọn)</Label>
            <Input id="reason" name="reason" placeholder="Nhập lý do nghỉ" />
          </div>
          <Button type="submit" disabled={isPending || !leaveType}>
            {isPending ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
