"use client";

import { useState, useTransition } from "react";
import {
  CalendarIcon,
  TrendingUp,
  CreditCard,
  Receipt,
  DollarSign,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PAYMENT_METHOD_LABELS } from "@comtammatu/shared";
import { getReportData, type ReportSummary } from "./actions";
import {
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@comtammatu/ui";

function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

const PIE_COLORS = [
  "hsl(142, 76%, 36%)",
  "hsl(210, 80%, 55%)",
  "hsl(45, 90%, 50%)",
  "hsl(0, 70%, 50%)",
  "hsl(270, 60%, 55%)",
  "hsl(180, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(330, 60%, 55%)",
];

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: "Tại chỗ",
  takeaway: "Mang đi",
  delivery: "Giao hàng",
};

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
};

function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isPositive ? "text-green-600" : "text-red-600",
      )}
    >
      {isPositive ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function exportCSV(data: ReportSummary) {
  const lines: string[] = [];

  // Daily breakdown
  lines.push("=== Doanh thu theo ngày ===");
  lines.push("Ngày,Đơn hàng,Doanh thu,TB/đơn");
  for (const row of data.dailyData) {
    lines.push(`${row.date},${row.orders},${row.revenue},${row.avgTicket.toFixed(0)}`);
  }

  lines.push("");
  lines.push("=== Phương thức thanh toán ===");
  lines.push("Phương thức,Số lượng,Tổng tiền");
  for (const pm of data.paymentMethods) {
    const label = PAYMENT_METHOD_LABELS[pm.method as keyof typeof PAYMENT_METHOD_LABELS] ?? pm.method;
    lines.push(`${label},${pm.count},${pm.total}`);
  }

  lines.push("");
  lines.push("=== Món bán chạy ===");
  lines.push("Món,Số lượng,Doanh thu");
  for (const item of data.topItems) {
    lines.push(`"${item.name}",${item.qty},${item.revenue}`);
  }

  if (data.orderTypeMix && data.orderTypeMix.length > 0) {
    lines.push("");
    lines.push("=== Loại đơn hàng ===");
    lines.push("Loại,Số lượng,Doanh thu");
    for (const ot of data.orderTypeMix) {
      const label = ORDER_TYPE_LABELS[ot.type] ?? ot.type;
      lines.push(`${label},${ot.count},${ot.revenue}`);
    }
  }

  // Add BOM for UTF-8 Excel support
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bao-cao-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient({
  initialData,
  initialStart,
  initialEnd,
}: {
  initialData: ReportSummary;
  initialStart: string;
  initialEnd: string;
}) {
  const [startDate, setStartDate] = useState<Date>(
    new Date(initialStart + "T00:00:00"),
  );
  const [endDate, setEndDate] = useState<Date>(
    new Date(initialEnd + "T00:00:00"),
  );
  const [data, setData] = useState<ReportSummary>(initialData);
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    startTransition(async () => {
      const result = await getReportData(start, end);
      setData(result);
    });
  }

  // Prepare chart data for daily revenue
  const chartDailyData = data.dailyData.map((row) => ({
    ...row,
    label: row.date.slice(5).replace("-", "/"), // "03/11"
  }));

  // Prepare pie data for payment methods
  const piePaymentData = data.paymentMethods.map((pm) => ({
    name: PAYMENT_METHOD_LABELS[pm.method as keyof typeof PAYMENT_METHOD_LABELS] ?? pm.method,
    value: pm.total,
    count: pm.count,
  }));

  // Prepare top items chart (top 10 only)
  const chartTopItems = data.topItems.slice(0, 10).map((item) => ({
    name: item.name.length > 20 ? item.name.slice(0, 18) + "…" : item.name,
    fullName: item.name,
    qty: item.qty,
    revenue: item.revenue,
  }));

  // Prepare order type data
  const orderTypePieData = (data.orderTypeMix ?? []).map((ot) => ({
    name: ORDER_TYPE_LABELS[ot.type] ?? ot.type,
    value: ot.count,
    revenue: ot.revenue,
  }));

  const growth = data.growthVsPrev;

  return (
    <div className="space-y-6">
      {/* Date range selector + export */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(startDate, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(d) => d && setStartDate(d)}
              locale={vi}
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">đến</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !endDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(endDate, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(d) => d && setEndDate(d)}
              locale={vi}
            />
          </PopoverContent>
        </Popover>

        <Button onClick={handleRefresh} disabled={isPending}>
          {isPending ? "Đang tải..." : "Xem báo cáo"}
        </Button>

        <Button
          variant="outline"
          onClick={() => exportCSV(data)}
          disabled={data.totalOrders === 0}
          className="gap-1"
        >
          <Download className="size-4" />
          Xuất CSV
        </Button>
      </div>

      {/* Summary cards with growth badges */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVND(data.totalRevenue)}</div>
            {growth && <GrowthBadge value={growth.revenuePct} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalOrders}</div>
            {growth && <GrowthBadge value={growth.ordersPct} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Giá trị TB/đơn</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVND(data.avgTicket)}</div>
            {growth && <GrowthBadge value={growth.avgTicketPct} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng tip</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVND(data.totalTips)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue trend chart */}
      {chartDailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ doanh thu theo ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartDailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  interval={chartDailyData.length > 15 ? Math.floor(chartDailyData.length / 10) : 0}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [
                    formatVND((value as number) ?? 0),
                    "Doanh thu",
                  ]}
                  labelFormatter={(label) => `Ngày ${String(label)}`}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Payment methods: chart + table side by side */}
      {data.paymentMethods.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={piePaymentData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {piePaymentData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      formatVND((value as number) ?? 0),
                      "Tổng tiền",
                    ]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chi tiết thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phương thức</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.paymentMethods.map((pm) => (
                    <TableRow key={pm.method}>
                      <TableCell>
                        {PAYMENT_METHOD_LABELS[pm.method as keyof typeof PAYMENT_METHOD_LABELS] ?? pm.method}
                      </TableCell>
                      <TableCell className="text-right">{pm.count}</TableCell>
                      <TableCell className="text-right">{formatVND(pm.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order type mix */}
      {orderTypePieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Phân loại đơn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={orderTypePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={90}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {orderTypePieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, props) => [
                      `${(value as number) ?? 0} đơn (${formatVND((props as { payload?: { revenue?: number } })?.payload?.revenue ?? 0)})`,
                      "Số lượng",
                    ]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col justify-center space-y-3">
                {(data.orderTypeMix ?? []).map((ot, i) => (
                  <div key={ot.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-3 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-sm font-medium">
                        {ORDER_TYPE_LABELS[ot.type] ?? ot.type}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <span className="font-bold">{ot.count}</span>
                      <span className="ml-2 text-muted-foreground">{formatVND(ot.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily breakdown: chart + table */}
        {data.dailyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Doanh thu theo ngày</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-right">Đơn</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">TB/đơn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dailyData.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell className="text-right">{row.orders}</TableCell>
                        <TableCell className="text-right">
                          {formatVND(row.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatVND(row.avgTicket)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top items: chart + table */}
        {data.topItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Món bán chạy</CardTitle>
            </CardHeader>
            <CardContent>
              {chartTopItems.length > 0 && (
                <ResponsiveContainer width="100%" height={Math.max(200, chartTopItems.length * 36)}>
                  <BarChart data={chartTopItems} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value, _name, props) => [
                        `${(value as number) ?? 0} phần (${formatVND((props as { payload?: { fullName?: string; revenue?: number } })?.payload?.revenue ?? 0)})`,
                        (props as { payload?: { fullName?: string } })?.payload?.fullName ?? "",
                      ]}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Bar dataKey="qty" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="mt-4 max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Món</TableHead>
                      <TableHead className="text-right">SL</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topItems.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.qty}</TableCell>
                        <TableCell className="text-right">
                          {formatVND(item.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
