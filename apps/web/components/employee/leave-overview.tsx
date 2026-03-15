"use client";

import { CalendarOff } from "lucide-react";
import { getLeaveTypeLabel, getLeaveStatusLabel, formatDate } from "@comtammatu/shared";
import { Badge, Card, CardContent } from "@comtammatu/ui";
import { CreateLeaveDialog } from "./create-leave-dialog";

const ANNUAL_LEAVE_QUOTA = 12; // Default annual leave days

interface LeaveRequest {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  reason: string | null;
  approver: { full_name: string } | null;
}

interface LeaveSummary {
  annual: number;
  sick: number;
  unpaid: number;
  maternity: number;
}

interface LeaveOverviewProps {
  leaveRequests: LeaveRequest[];
  leaveSummary: LeaveSummary;
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
  const annualRemaining = ANNUAL_LEAVE_QUOTA - leaveSummary.annual;

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
              {leaveSummary.annual +
                leaveSummary.sick +
                leaveSummary.unpaid +
                leaveSummary.maternity}
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
        <CreateLeaveDialog />
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
