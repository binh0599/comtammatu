"use client";

import { formatDateTime, getAttendanceStatusLabel } from "@comtammatu/shared";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

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
  manual: "Thủ công",
  pos_session: "Ca POS",
  terminal_login: "Đăng nhập",
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

export function AttendanceTab({ attendance }: { attendance: AttendanceRecord[] }) {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Chấm công</h2>
        <p className="text-muted-foreground">Dữ liệu chấm công ngày {today}</p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Nhân viên</TableHead>
              <TableHead scope="col">Chi nhánh</TableHead>
              <TableHead scope="col">Vào ca</TableHead>
              <TableHead scope="col">Ra ca</TableHead>
              <TableHead scope="col">Số giờ</TableHead>
              <TableHead scope="col">Tăng ca</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col">Nguồn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                  Chưa có dữ liệu chấm công cho ngày này
                </TableCell>
              </TableRow>
            ) : (
              attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.employees.profiles.full_name}
                  </TableCell>
                  <TableCell>{record.branches.name}</TableCell>
                  <TableCell>{record.clock_in ? formatDateTime(record.clock_in) : "-"}</TableCell>
                  <TableCell>{record.clock_out ? formatDateTime(record.clock_out) : "-"}</TableCell>
                  <TableCell>
                    {record.hours_worked != null ? `${record.hours_worked.toFixed(1)}h` : "-"}
                  </TableCell>
                  <TableCell>
                    {record.overtime_hours != null && record.overtime_hours > 0
                      ? `${record.overtime_hours.toFixed(1)}h`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {record.status ? (
                      <Badge variant={getAttendanceBadgeVariant(record.status)}>
                        {getAttendanceStatusLabel(record.status)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{SOURCE_LABELS[record.source] ?? record.source}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
