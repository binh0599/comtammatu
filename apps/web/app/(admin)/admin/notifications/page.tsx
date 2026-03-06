import { Header } from "@/components/admin/header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNotifications } from "./actions";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTypeBadge(eventType: string) {
  if (eventType === "inventory_low_stock") {
    return <Badge variant="outline">Tồn kho thấp</Badge>;
  }
  if (eventType === "inventory_expiring") {
    return <Badge variant="destructive">Sắp hết hạn</Badge>;
  }
  return <Badge variant="secondary">{eventType}</Badge>;
}

function getSeverityClass(severity: string) {
  if (severity === "critical") return "bg-red-50 dark:bg-red-950/30";
  if (severity === "warning") return "bg-yellow-50 dark:bg-yellow-950/30";
  return "";
}

function getDetailsSummary(eventType: string, details: Record<string, unknown> | null) {
  if (!details) return "-";

  if (eventType === "inventory_low_stock") {
    return `${String(details.ingredient_name ?? "")} - Hiện tại: ${String(details.current_quantity ?? 0)} ${String(details.unit ?? "")}, Tối thiểu: ${String(details.min_quantity ?? 0)} ${String(details.unit ?? "")}`;
  }

  if (eventType === "inventory_expiring") {
    const expiryDate = details.expiry_date ? formatDate(String(details.expiry_date)) : "N/A";
    return `${String(details.ingredient_name ?? "")} - SL: ${String(details.quantity ?? 0)}, Hạn: ${expiryDate}`;
  }

  return JSON.stringify(details);
}

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <>
      <Header breadcrumbs={[{ label: "Thông báo kho hàng" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Cảnh báo kho hàng</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Không có cảnh báo nào.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Thời gian</TableHead>
                      <TableHead className="w-[140px]">Loại</TableHead>
                      <TableHead className="w-[100px]">Mức độ</TableHead>
                      <TableHead className="w-[140px]">Chi nhánh</TableHead>
                      <TableHead>Chi tiết</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((event: Record<string, unknown>) => {
                      const severity = String(event.severity ?? "info");
                      const eventType = String(event.event_type ?? "");
                      const details = event.details as Record<string, unknown> | null;
                      const branchName = details?.branch_name
                        ? String(details.branch_name)
                        : "-";

                      return (
                        <TableRow
                          key={String(event.id)}
                          className={getSeverityClass(severity)}
                        >
                          <TableCell className="text-sm">
                            {event.created_at
                              ? formatDate(String(event.created_at))
                              : "-"}
                          </TableCell>
                          <TableCell>{getTypeBadge(eventType)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                severity === "critical"
                                  ? "destructive"
                                  : severity === "warning"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {severity === "critical"
                                ? "Nghiêm trọng"
                                : severity === "warning"
                                  ? "Cảnh báo"
                                  : "Thông tin"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{branchName}</TableCell>
                          <TableCell className="text-sm">
                            {getDetailsSummary(eventType, details)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
