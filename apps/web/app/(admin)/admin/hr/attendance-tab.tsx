"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, getAttendanceStatusLabel } from "@comtammatu/shared";

interface AttendanceRecord {
  id: number;
  employee_id: number;
  branch_id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number | null;
  overtime_hours: number | null;
  status: string | null;
  source: string;
  employees: {
    profile_id: string;
    profiles: { full_name: string };
  };
  branches: { name: string };
}

const SOURCE_LABELS: Record<string, string> = {
  qr: "QR Code",
  manual: "Thu cong",
  pos_session: "Ca POS",
  terminal_login: "Dang nhap",
};

function getAttendanceBadgeVariant(
  status: string | null
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "present":
      return "default";
    case "absent":
      return "destructive";
    case "late":
      return "outline";
    case "early_leave":
      return "secondary";
    default:
      return "default";
  }
}

export function AttendanceTab({
  attendance,
}: {
  attendance: AttendanceRecord[];
}) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Cham cong</h2>
        <p className="text-muted-foreground">
          Du lieu cham cong ngay {today}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhan vien</TableHead>
              <TableHead>Chi nhanh</TableHead>
              <TableHead>Vao ca</TableHead>
              <TableHead>Ra ca</TableHead>
              <TableHead>So gio</TableHead>
              <TableHead>Tang ca</TableHead>
              <TableHead>Trang thai</TableHead>
              <TableHead>Nguon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co du lieu cham cong cho ngay nay
                </TableCell>
              </TableRow>
            ) : (
              attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.employees.profiles.full_name}
                  </TableCell>
                  <TableCell>{record.branches.name}</TableCell>
                  <TableCell>
                    {record.clock_in ? formatDateTime(record.clock_in) : "-"}
                  </TableCell>
                  <TableCell>
                    {record.clock_out ? formatDateTime(record.clock_out) : "-"}
                  </TableCell>
                  <TableCell>
                    {record.hours_worked != null
                      ? `${record.hours_worked.toFixed(1)}h`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {record.overtime_hours != null && record.overtime_hours > 0
                      ? `${record.overtime_hours.toFixed(1)}h`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {record.status ? (
                      <Badge
                        variant={getAttendanceBadgeVariant(record.status)}
                      >
                        {getAttendanceStatusLabel(record.status)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {SOURCE_LABELS[record.source] ?? record.source}
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
