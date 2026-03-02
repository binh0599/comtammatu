"use client";

import { useState, useMemo } from "react";
import { CalendarIcon, Eye, Search } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  formatPrice,
  formatDateTime,
  formatDate,
  getOrderStatusLabel,
  getOrderTypeLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "@comtammatu/shared/src/utils/format";
import { ORDER_STATUSES, ORDER_TYPES } from "@comtammatu/shared/src/constants";

// --- Types ---

interface OrderItem {
  id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  item_total: number;
  status: string;
  notes: string | null;
  menu_items: { name: string } | null;
}

interface Payment {
  id: number;
  method: string;
  status: string;
  amount: number;
  paid_at: string | null;
}

interface Order {
  id: number;
  order_number: string;
  branch_id: number;
  type: string;
  status: string;
  subtotal: number;
  tax: number;
  service_charge: number;
  discount_total: number;
  total: number;
  notes: string | null;
  customer_id: number | null;
  table_id: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  branches: { id: number; name: string } | null;
  order_items: OrderItem[];
  payments: Payment[];
}

interface Branch {
  id: number;
  name: string;
}

interface OrdersHistoryProps {
  orders: Order[];
  branches: Branch[];
}

// --- Badge styles ---

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  preparing: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  ready: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  served: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  completed: "bg-green-100 text-green-800 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
};

const TYPE_BADGE: Record<string, string> = {
  dine_in: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  takeaway: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  delivery: "bg-teal-100 text-teal-800 hover:bg-teal-100",
};

// --- Date preset helpers ---

type DatePreset = "today" | "week" | "month" | "last_month" | "custom";

function getPresetRange(preset: DatePreset): DateRange | undefined {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { from: startOfDay, to: now };
    case "week": {
      const dayOfWeek = startOfDay.getDay();
      const monday = new Date(startOfDay);
      monday.setDate(startOfDay.getDate() - ((dayOfWeek + 6) % 7));
      return { from: monday, to: now };
    }
    case "month": {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: firstOfMonth, to: now };
    }
    case "last_month": {
      const firstOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: firstOfLastMonth, to: lastOfLastMonth };
    }
    default:
      return undefined;
  }
}

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  last_month: "Tháng trước",
  custom: "Tùy chọn",
};

// --- Component ---

export function OrdersHistory({ orders, branches }: OrdersHistoryProps) {
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const dateRange =
    datePreset === "custom" ? customRange : getPresetRange(datePreset);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      // Date filter
      if (dateRange?.from) {
        const orderDate = new Date(o.created_at);
        if (orderDate < dateRange.from) return false;
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (orderDate > endOfDay) return false;
        }
      }

      // Branch filter
      if (branchFilter !== "all" && o.branch_id !== Number(branchFilter))
        return false;

      // Status filter
      if (statusFilter !== "all" && o.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== "all" && o.type !== typeFilter) return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!o.order_number.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [orders, dateRange, branchFilter, statusFilter, typeFilter, searchQuery]);

  // Summary stats
  const totalRevenue = filtered.reduce((sum, o) => sum + Number(o.total), 0);
  const completedCount = filtered.filter(
    (o) => o.status === "completed"
  ).length;
  const cancelledCount = filtered.filter(
    (o) => o.status === "cancelled"
  ).length;

  function getPaymentSummary(payments: Payment[]): string {
    const completed = payments.filter((p) => p.status === "completed");
    if (completed.length === 0) return "—";
    const methods = [...new Set(completed.map((p) => getPaymentMethodLabel(p.method)))];
    return methods.join(", ");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Lịch sử đơn hàng
        </h2>
        <p className="text-muted-foreground">
          Xem lịch sử đơn hàng tất cả chi nhánh
        </p>
      </div>

      {/* Date presets */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          Object.entries(PRESET_LABELS) as [DatePreset, string][]
        ).map(([key, label]) =>
          key !== "custom" ? (
            <Button
              key={key}
              variant={datePreset === key ? "default" : "outline"}
              size="sm"
              onClick={() => setDatePreset(key)}
            >
              {label}
            </Button>
          ) : null
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={datePreset === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setDatePreset("custom")}
            >
              <CalendarIcon className="mr-1 h-4 w-4" />
              {datePreset === "custom" && customRange?.from
                ? `${formatDate(customRange.from)}${customRange.to ? ` – ${formatDate(customRange.to)}` : ""}`
                : "Tùy chọn"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={(range) => {
                setCustomRange(range);
                setDatePreset("custom");
              }}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Tìm theo mã đơn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 pl-8"
          />
        </div>

        {branches.length > 1 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Chi nhánh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chi nhánh</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {getOrderStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Loại đơn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {ORDER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {getOrderTypeLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Summary */}
        <div className="text-muted-foreground ml-auto text-sm">
          {filtered.length} đơn &middot;{" "}
          <span className="font-medium text-green-700">
            {completedCount} hoàn tất
          </span>
          {cancelledCount > 0 && (
            <>
              {" "}
              &middot;{" "}
              <span className="font-medium text-red-600">
                {cancelledCount} đã huỷ
              </span>
            </>
          )}
          {" "}&middot; Doanh thu:{" "}
          <span className="font-medium text-black">
            {formatPrice(totalRevenue)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Chi nhánh</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-center">Số món</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Thanh toán</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  Không tìm thấy đơn hàng nào
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm">
                    {o.order_number}
                  </TableCell>
                  <TableCell>{o.branches?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={TYPE_BADGE[o.type] ?? ""}>
                      {getOrderTypeLabel(o.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[o.status] ?? ""}>
                      {getOrderStatusLabel(o.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {o.order_items.length}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(Number(o.total))}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getPaymentSummary(o.payments)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(o.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Chi tiết"
                      onClick={() => setDetailOrder(o)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={detailOrder !== null}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chi tiết đơn hàng {detailOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              Thông tin chi tiết đơn hàng
            </DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-6 py-4">
              {/* Order info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Chi nhánh:</span>{" "}
                  <span className="font-medium">
                    {detailOrder.branches?.name ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Loại:</span>{" "}
                  <Badge className={TYPE_BADGE[detailOrder.type] ?? ""}>
                    {getOrderTypeLabel(detailOrder.type)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Trạng thái:</span>{" "}
                  <Badge className={STATUS_BADGE[detailOrder.status] ?? ""}>
                    {getOrderStatusLabel(detailOrder.status)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Thời gian tạo:</span>{" "}
                  <span>{formatDateTime(detailOrder.created_at)}</span>
                </div>
                {detailOrder.table_id && (
                  <div>
                    <span className="text-muted-foreground">Bàn:</span>{" "}
                    <span>#{detailOrder.table_id}</span>
                  </div>
                )}
                {detailOrder.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Ghi chú:</span>{" "}
                    <span>{detailOrder.notes}</span>
                  </div>
                )}
              </div>

              {/* Order items */}
              <div>
                <h4 className="mb-2 text-sm font-semibold">
                  Danh sách món ({detailOrder.order_items.length})
                </h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Món</TableHead>
                        <TableHead className="text-center">SL</TableHead>
                        <TableHead className="text-right">Đơn giá</TableHead>
                        <TableHead className="text-right">
                          Thành tiền
                        </TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailOrder.order_items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.menu_items?.name ?? `#${item.menu_item_id}`}
                            {item.notes && (
                              <span className="text-muted-foreground block text-xs">
                                {item.notes}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(Number(item.unit_price))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(Number(item.item_total))}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={STATUS_BADGE[item.status] ?? ""}
                            >
                              {getOrderStatusLabel(item.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính:</span>
                  <span>{formatPrice(Number(detailOrder.subtotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thuế:</span>
                  <span>{formatPrice(Number(detailOrder.tax))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí dịch vụ:</span>
                  <span>
                    {formatPrice(Number(detailOrder.service_charge))}
                  </span>
                </div>
                {Number(detailOrder.discount_total) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Giảm giá:</span>
                    <span>
                      -{formatPrice(Number(detailOrder.discount_total))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Tổng cộng:</span>
                  <span>{formatPrice(Number(detailOrder.total))}</span>
                </div>
              </div>

              {/* Payments */}
              {detailOrder.payments.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Thanh toán</h4>
                  <div className="space-y-2 text-sm">
                    {detailOrder.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span>{getPaymentMethodLabel(p.method)}</span>
                          <Badge
                            className={
                              p.status === "completed"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : p.status === "failed"
                                  ? "bg-red-100 text-red-800 hover:bg-red-100"
                                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                            }
                          >
                            {getPaymentStatusLabel(p.status)}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">
                            {formatPrice(Number(p.amount))}
                          </span>
                          {p.paid_at && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              {formatDateTime(p.paid_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
