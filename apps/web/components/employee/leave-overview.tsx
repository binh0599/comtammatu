"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarOff, Plus } from "lucide-react";
import {
  getLeaveTypeLabel,
  getLeaveStatusLabel,
  formatDate,
  LEAVE_TYPES,
} from "@comtammatu/shared";
import { createMyLeaveRequest } from "@/app/(employee)/employee/actions";
import { toast } from "sonner";

const ANNUAL_LEAVE_QUOTA = 12; // Default annual leave days

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface LeaveOverviewProps {
  leaveRequests: any[];
  leaveSummary: { annual: number; sick: number; unpaid: number; maternity: number };
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "approved":
      return "default" as const;
    case "rejected":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export function LeaveOverview({ leaveRequests, leaveSummary }: LeaveOverviewProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [leaveType, setLeaveType] = useState<string>("");

  const annualRemaining = ANNUAL_LEAVE_QUOTA - leaveSummary.annual;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const startDate = formData.get("start_date") as string;
    const endDate = formData.get("end_date") as string;

    // Validate end_date >= start_date
    if (endDate < startDate) {
      toast.error("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
      return;
    }

    // Calculate days
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
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs">Phép năm còn lại</p>
            <p className="text-2xl font-bold">{annualRemaining}</p>
            <p className="text-muted-foreground text-xs">/ {ANNUAL_LEAVE_QUOTA} ngày</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs">Đã sử dụng (năm nay)</p>
            <p className="text-2xl font-bold">
              {leaveSummary.annual + leaveSummary.sick + leaveSummary.unpaid + leaveSummary.maternity}
            </p>
            <p className="text-muted-foreground text-xs">ngày</p>
          </CardContent>
        </Card>
      </div>

      {/* Detail breakdown */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Phép năm</p>
              <p className="text-lg font-semibold">{leaveSummary.annual}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ốm</p>
              <p className="text-lg font-semibold">{leaveSummary.sick}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Không lương</p>
              <p className="text-lg font-semibold">{leaveSummary.unpaid}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Thai sản</p>
              <p className="text-lg font-semibold">{leaveSummary.maternity}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header + create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Lịch sử nghỉ phép</h2>
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
      </div>

      {/* Leave request list */}
      {leaveRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <CalendarOff className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-sm">Chưa có yêu cầu nghỉ phép nào.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {leaveRequests.map((req) => (
            <Card key={req.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{getLeaveTypeLabel(req.type)}</p>
                    <p className="text-muted-foreground text-sm">
                      {formatDate(req.start_date)} - {formatDate(req.end_date)} ({req.days} ngày)
                    </p>
                    {req.reason && (
                      <p className="text-muted-foreground text-xs mt-1">{req.reason}</p>
                    )}
                    {req.approver?.full_name && (
                      <p className="text-muted-foreground text-xs mt-1">
                        Duyệt bởi: {req.approver.full_name}
                      </p>
                    )}
                  </div>
                  <Badge variant={getStatusBadgeVariant(req.status)}>
                    {getLeaveStatusLabel(req.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
