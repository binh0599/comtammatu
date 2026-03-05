"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarDays, CalendarOff, UserCircle } from "lucide-react";
import { formatTime, getShiftAssignmentStatusLabel, getAttendanceStatusLabel } from "@comtammatu/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EmployeeHomeProps {
  todayShifts: any[];
  todayAttendance: any | null;
  employee: any | null;
}

export function EmployeeHome({ todayShifts, todayAttendance, employee }: EmployeeHomeProps) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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

      {/* Attendance status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Chấm công hôm nay
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!todayAttendance ? (
            <p className="text-muted-foreground text-sm">Chưa có dữ liệu chấm công hôm nay.</p>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {todayAttendance.clock_in && (
                  <p>Vào: <span className="font-medium">{formatTime(todayAttendance.clock_in)}</span></p>
                )}
                {todayAttendance.clock_out && (
                  <p>Ra: <span className="font-medium">{formatTime(todayAttendance.clock_out)}</span></p>
                )}
              </div>
              <Badge variant="outline">
                {getAttendanceStatusLabel(todayAttendance.status)}
              </Badge>
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
