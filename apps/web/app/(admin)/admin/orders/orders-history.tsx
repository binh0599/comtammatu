"use client";

import { useState, useMemo } from "react";
import { CalendarIcon, Eye, Search } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  formatPrice,
  formatDateTime,
  formatDate,
  getOrderStatusLabel,
  getOrderTypeLabel,
  getPaymentMethodLabel,
} from "@comtammatu/shared/src/utils/format";
import { ORDER_STATUSES, ORDER_TYPES } from "@comtammatu/shared/src/constants";
import type { Order, Payment, Branch } from "./orders-types";
import { OrderDetailDialog, STATUS_BADGE, TYPE_BADGE } from "./order-detail-dialog";
import {
  Badge,
  Button,
  Calendar,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@comtammatu/ui";

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

export function OrdersHistory({ orders, branches }: { orders: Order[]; branches: Branch[] }) {
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
      if (dateRange?.from) {
        const orderDate = new Date(o.created_at);
        if (orderDate < dateRange.from) return false;
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (orderDate > endOfDay) return false;
        }
      }
      if (branchFilter !== "all" && o.branch_id !== Number(branchFilter))
        return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (typeFilter !== "all" && o.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!o.order_number.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, dateRange, branchFilter, statusFilter, typeFilter, searchQuery]);

  const totalRevenue = filtered.reduce((sum, o) => sum + Number(o.total), 0);
  const completedCount = filtered.filter((o) => o.status === "completed").length;
  const cancelledCount = filtered.filter((o) => o.status === "cancelled").length;

  function getPaymentSummary(payments: Payment[]): string {
    const completed = payments.filter((p) => p.status === "completed");
    if (completed.length === 0) return "—";
    const methods = [...new Set(completed.map((p) => getPaymentMethodLabel(p.method)))];
    return methods.join(", ");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Lịch sử đơn hàng</h2>
        <p className="text-muted-foreground">Xem lịch sử đơn hàng tất cả chi nhánh</p>
      </div>

      {/* Date presets */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.entries(PRESET_LABELS) as [DatePreset, string][]).map(([key, label]) =>
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
            className="w-full sm:w-56 pl-8"
          />
        </div>

        {branches.length > 1 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-44">
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
          <SelectTrigger className="w-full sm:w-44">
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
          <SelectTrigger className="w-full sm:w-36">
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

        <div className="text-muted-foreground w-full sm:ml-auto sm:w-auto text-sm">
          {filtered.length} đơn &middot;{" "}
          <span className="font-medium text-green-700">{completedCount} hoàn tất</span>
          {cancelledCount > 0 && (
            <> &middot; <span className="font-medium text-red-600">{cancelledCount} đã huỷ</span></>
          )}
          {" "}&middot; Doanh thu:{" "}
          <span className="font-medium text-black">{formatPrice(totalRevenue)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table aria-label="Bảng lịch sử đơn hàng">
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
                <TableCell colSpan={9} className="text-muted-foreground h-24 text-center">
                  Không tìm thấy đơn hàng nào
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                  <TableCell>{o.branches?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={TYPE_BADGE[o.type] ?? ""}>{getOrderTypeLabel(o.type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[o.status] ?? ""}>{getOrderStatusLabel(o.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{o.order_items.length}</TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(Number(o.total))}</TableCell>
                  <TableCell className="text-sm">{getPaymentSummary(o.payments)}</TableCell>
                  <TableCell className="text-sm">{formatDateTime(o.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="Chi tiết" onClick={() => setDetailOrder(o)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OrderDetailDialog
        order={detailOrder}
        open={detailOrder !== null}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null);
        }}
      />
    </div>
  );
}
