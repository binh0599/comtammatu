"use client";

import { Fragment, useState } from "react";
import { FileText } from "lucide-react";
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
import { formatDateTime } from "@comtammatu/shared";

interface AuditLog {
  id: number;
  action: string;
  resource_type: string;
  resource_id: number;
  user_id: string;
  tenant_id: number;
  ip_address: string | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
  user_name: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xóa",
  insert: "Tạo mới",
  upsert: "Tạo/Cập nhật",
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  menu_item: "Món ăn",
  menu_category: "Danh mục",
  menu: "Thực đơn",
  order: "Đơn hàng",
  order_item: "Món trong đơn",
  ingredient: "Nguyên liệu",
  recipe: "Công thức",
  stock_level: "Tồn kho",
  stock_movement: "Phiếu kho",
  supplier: "Nhà cung cấp",
  purchase_order: "Đơn mua hàng",
  employee: "Nhân viên",
  shift: "Ca làm",
  shift_assignment: "Phân ca",
  leave_request: "Đơn nghỉ phép",
  pos_terminal: "Thiết bị POS",
  pos_session: "Ca thu ngân",
  kds_station: "Bếp KDS",
  payment: "Thanh toán",
  customer: "Khách hàng",
  branch: "Chi nhánh",
  table: "Bàn",
  profile: "Hồ sơ",
};

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function getResourceTypeLabel(resourceType: string): string {
  return RESOURCE_TYPE_LABELS[resourceType] ?? resourceType;
}

function ActionBadge({ action }: { action: string }) {
  switch (action) {
    case "create":
    case "insert":
      return (
        <Badge
          variant="outline"
          className="border-green-500 text-green-600"
        >
          {getActionLabel(action)}
        </Badge>
      );
    case "update":
    case "upsert":
      return (
        <Badge
          variant="outline"
          className="border-blue-500 text-blue-600"
        >
          {getActionLabel(action)}
        </Badge>
      );
    case "delete":
      return <Badge variant="destructive">{getActionLabel(action)}</Badge>;
    default:
      return <Badge variant="secondary">{getActionLabel(action)}</Badge>;
  }
}

export function AuditTab({
  logs,
  resourceTypes,
}: {
  logs: AuditLog[];
  resourceTypes: string[];
}) {
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredLogs =
    resourceFilter === "all"
      ? logs
      : logs.filter((l) => l.resource_type === resourceFilter);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <FileText className="text-muted-foreground h-4 w-4" />
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Lọc theo đối tượng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {resourceTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {getResourceTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm">
          {filteredLogs.length} bản ghi
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Hành động</TableHead>
              <TableHead>Đối tượng</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Người thực hiện</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chưa có nhật ký hoạt động nào.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <Fragment key={log.id}>
                  <TableRow>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={log.action} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getResourceTypeLabel(log.resource_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      #{log.resource_id}
                    </TableCell>
                    <TableCell>{log.user_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ip_address ?? "—"}
                    </TableCell>
                    <TableCell>
                      {log.old_value || log.new_value ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedId(
                              expandedId === log.id ? null : log.id
                            )
                          }
                        >
                          {expandedId === log.id
                            ? "Thu gọn"
                            : "Xem chi tiết"}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedId === log.id && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <Card className="m-2 shadow-none">
                          <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                            <div>
                              <CardHeader className="p-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                  Giá trị cũ
                                </CardTitle>
                              </CardHeader>
                              {log.old_value ? (
                                <pre className="bg-muted max-h-60 overflow-auto rounded-md p-3 text-xs">
                                  <code>
                                    {JSON.stringify(log.old_value, null, 2)}
                                  </code>
                                </pre>
                              ) : (
                                <p className="text-muted-foreground text-sm">
                                  Không có dữ liệu
                                </p>
                              )}
                            </div>
                            <div>
                              <CardHeader className="p-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                  Giá trị mới
                                </CardTitle>
                              </CardHeader>
                              {log.new_value ? (
                                <pre className="bg-muted max-h-60 overflow-auto rounded-md p-3 text-xs">
                                  <code>
                                    {JSON.stringify(log.new_value, null, 2)}
                                  </code>
                                </pre>
                              ) : (
                                <p className="text-muted-foreground text-sm">
                                  Không có dữ liệu
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
