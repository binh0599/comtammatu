"use client";

import { useState } from "react";
import { ShieldAlert, AlertTriangle, ShieldX, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, getSeverityLabel } from "@comtammatu/shared";

interface SecurityEvent {
  id: number;
  event_type: string;
  severity: string;
  source_ip: string | null;
  user_id: string | null;
  terminal_id: number | null;
  tenant_id: number | null;
  details: unknown;
  created_at: string;
  user_name: string | null;
  terminal_name: string | null;
}

interface SecuritySummary {
  info: number;
  warning: number;
  critical: number;
  failedLogins: number;
}

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case "info":
      return <Badge variant="secondary">{getSeverityLabel(severity)}</Badge>;
    case "warning":
      return (
        <Badge
          variant="outline"
          className="border-yellow-500 text-yellow-600"
        >
          {getSeverityLabel(severity)}
        </Badge>
      );
    case "critical":
      return (
        <Badge variant="destructive">{getSeverityLabel(severity)}</Badge>
      );
    default:
      return <Badge variant="secondary">{severity}</Badge>;
  }
}

function truncateJson(value: unknown, maxLength = 60): string {
  if (!value) return "";
  const str = JSON.stringify(value);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function EventsTab({
  events,
  summary,
}: {
  events: SecurityEvent[];
  summary: SecuritySummary;
}) {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredEvents =
    severityFilter === "all"
      ? events
      : events.filter((e) => e.severity === severityFilter);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Đăng nhập thất bại (24h)
            </CardTitle>
            <ShieldAlert className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.failedLogins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cảnh báo (24h)
            </CardTitle>
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.warning}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Nghiêm trọng (24h)
            </CardTitle>
            <ShieldX className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.critical}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Shield className="text-muted-foreground h-4 w-4" />
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Lọc theo mức độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="info">Thông tin</SelectItem>
            <SelectItem value="warning">Cảnh báo</SelectItem>
            <SelectItem value="critical">Nghiêm trọng</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm">
          {filteredEvents.length} sự kiện
        </span>
      </div>

      {/* Events Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Loại sự kiện</TableHead>
              <TableHead>Mức độ</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Người dùng</TableHead>
              <TableHead>Thiết bị</TableHead>
              <TableHead>Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chưa có sự kiện bảo mật nào. Sự kiện sẽ được ghi nhận khi có
                  hoạt động đáng chú ý.
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(event.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {event.event_type}
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={event.severity} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {event.source_ip ?? "—"}
                  </TableCell>
                  <TableCell>{event.user_name ?? "—"}</TableCell>
                  <TableCell>{event.terminal_name ?? "—"}</TableCell>
                  <TableCell>
                    {event.details ? (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-sm"
                          onClick={() =>
                            setExpandedId(
                              expandedId === event.id ? null : event.id
                            )
                          }
                        >
                          {expandedId === event.id
                            ? "Thu gọn"
                            : truncateJson(event.details)}
                        </Button>
                        {expandedId === event.id && (
                          <pre className="bg-muted mt-2 max-w-xs overflow-auto rounded-md p-2 text-xs">
                            <code>
                              {JSON.stringify(event.details, null, 2)}
                            </code>
                          </pre>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
