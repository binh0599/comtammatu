"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarDays, CalendarOff, UserCircle, LogIn, LogOut } from "lucide-react";
import { formatTime, formatDateTime, getShiftAssignmentStatusLabel, getAttendanceStatusLabel } from "@comtammatu/shared";
import { clockIn, clockOut } from "@/app/(employee)/employee/actions";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EmployeeHomeProps {
  todayShifts: any[];
  todayAttendance: any | null;
  employee: any | null;
}

export function EmployeeHome({ todayShifts, todayAttendance, employee }: EmployeeHomeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const canClockIn = employee && !todayAttendance;
  const canClockOut = employee && todayAttendance && todayAttendance.clock_in && !todayAttendance.clock_out;

  function handleClockIn() {
    startTransition(async () => {
      const result = await clockIn();
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã chấm công vào ca");
        router.refresh();
      }
    });
  }

  function handleClockOut() {
    startTransition(async () => {
      const result = await clockOut();
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã chấm công ra ca");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm capitalize">{today}</p>

      {/* Today's shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Ca hôm nay
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayShifts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Hôm nay bạn không có ca làm.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {todayShifts.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{assignment.shifts?.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {formatTime(assignment.shifts?.start_time)} - {formatTime(assignment.shifts?.end_time)}
                    </p>
                    {assignment.shifts?.branches?.name && (
                      <p className="text-muted-foreground text-xs">{assignment.shifts.branches.name}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {getShiftAssignmentStatusLabel(assignment.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance + Clock in/out */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Chấm công hôm nay
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {todayAttendance.clock_in && (
                    <p>Vào: <span className="font-medium">{formatDateTime(todayAttendance.clock_in)}</span></p>
                  )}
                  {todayAttendance.clock_out && (
                    <p>Ra: <span className="font-medium">{formatDateTime(todayAttendance.clock_out)}</span></p>
                  )}
                  {todayAttendance.hours_worked != null && (
                    <p>Tổng: <span className="font-medium">{todayAttendance.hours_worked}h</span></p>
                  )}
                </div>
                <Badge variant="outline">
                  {getAttendanceStatusLabel(todayAttendance.status)}
                </Badge>
              </div>

              {canClockOut && (
                <Button
                  onClick={handleClockOut}
                  disabled={isPending}
                  variant="destructive"
                  className="w-full"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isPending ? "Đang xử lý..." : "Ra ca"}
                </Button>
              )}

              {todayAttendance.clock_out && (
                <p className="text-muted-foreground text-center text-xs">
                  Đã hoàn tất chấm công hôm nay.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">Chưa chấm công hôm nay.</p>
              {canClockIn && (
                <Button
                  onClick={handleClockIn}
                  disabled={isPending}
                  className="w-full"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {isPending ? "Đang xử lý..." : "Vào ca"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/employee/schedule" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent">
          <CalendarDays className="text-primary h-6 w-6" />
          <span className="text-xs font-medium">Lịch ca làm</span>
        </Link>
        <Link href="/employee/leave" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent">
          <CalendarOff className="text-primary h-6 w-6" />
          <span className="text-xs font-medium">Nghỉ phép</span>
        </Link>
        <Link href="/employee/profile" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent">
          <UserCircle className="text-primary h-6 w-6" />
          <span className="text-xs font-medium">Cá nhân</span>
        </Link>
      </div>

      {!employee && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent>
            <p className="text-sm text-amber-800">
              Hồ sơ nhân viên chưa được tạo. Vui lòng liên hệ quản lý.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
