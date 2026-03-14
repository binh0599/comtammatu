"use client";

import { useState, useTransition } from "react";
import {
  CalendarIcon,
  Download,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Store,
  UtensilsCrossed,
  Star,
  Banknote,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  AreaChart,
  Area,
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
  ComposedChart,
  Line,
} from "recharts";
import {
  getFinanceDashboardData,
  type FinanceDashboardData,
} from "./actions";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  cn,
} from "@comtammatu/ui";

// =====================
// Helpers
// =====================

function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

const CHART_COLORS = [
  "hsl(142, 76%, 36%)", // emerald
  "hsl(210, 80%, 55%)", // blue
  "hsl(45, 90%, 50%)",  // amber
  "hsl(270, 60%, 55%)", // violet
  "hsl(0, 70%, 50%)",   // red
  "hsl(180, 60%, 45%)", // teal
  "hsl(30, 80%, 55%)",  // orange
  "hsl(330, 60%, 55%)", // pink
];

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "13px",
};

// =====================
// CSV Export
// =====================

function exportFinanceCSV(data: FinanceDashboardData) {
  const lines: string[] = [];
  const bom = "\uFEFF";

  lines.push("=== TỔNG QUAN TÀI CHÍNH ===");
  lines.push(`Doanh thu hôm nay,${data.kpi.todayRevenue}`);
  lines.push(`Doanh thu tuần,${data.kpi.weekRevenue}`);
  lines.push(`Doanh thu tháng,${data.kpi.monthRevenue}`);
  lines.push(`Tổng tip,${data.kpi.totalTips}`);
  lines.push("");

  lines.push("=== DOANH THU THEO NGÀY ===");
  lines.push("Ngày,Doanh thu,Đơn hàng,Tip,TB/đơn");
  for (const row of data.revenueTrend) {
    lines.push(`${row.date},${row.revenue},${row.orders},${row.tips},${row.avgTicket.toFixed(0)}`);
  }
  lines.push("");

  lines.push("=== PHƯƠNG THỨC THANH TOÁN ===");
  lines.push("Phương thức,Số giao dịch,Tổng tiền,TB/giao dịch,%");
  for (const pm of data.paymentMethods) {
    lines.push(`${pm.label},${pm.count},${pm.total},${pm.avgPerTransaction.toFixed(0)},${pm.pctOfTotal.toFixed(1)}`);
  }
  lines.push("");

  lines.push("=== DOANH THU THEO CHI NHÁNH ===");
  lines.push("Chi nhánh,Doanh thu,Đơn hàng,TB/đơn,Tip,%");
  for (const b of data.branchFinance) {
    lines.push(`"${b.branchName}",${b.revenue},${b.orders},${b.avgTicket.toFixed(0)},${b.tips},${b.pctOfTotal.toFixed(1)}`);
  }
  lines.push("");

  lines.push("=== MÓN CÓ DOANH THU CAO NHẤT ===");
  lines.push("Món,Doanh thu,SL bán,Giá TB,%");
  for (const item of data.topRevenueItems) {
    lines.push(`"${item.name}",${item.revenue},${item.quantity},${item.avgPrice.toFixed(0)},${item.pctOfTotal.toFixed(1)}`);
  }

  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tai-chinh-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// =====================
// Main Component
// =====================

export function FinanceDashboardClient({
  initialData,
  initialStart,
  initialEnd,
}: {
  initialData: FinanceDashboardData;
  initialStart: string;
  initialEnd: string;
}) {
  const [startDate, setStartDate] = useState<Date>(new Date(initialStart + "T00:00:00"));
  const [endDate, setEndDate] = useState<Date>(new Date(initialEnd + "T00:00:00"));
  const [data, setData] = useState<FinanceDashboardData>(initialData);
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    startTransition(async () => {
      const result = await getFinanceDashboardData(start, end);
      setData(result);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Date Range Controls ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(startDate, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} locale={vi} />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-sm">đến</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(endDate, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} locale={vi} />
          </PopoverContent>
        </Popover>

        <Button onClick={handleRefresh} disabled={isPending} className="gap-1.5">
          <RefreshCw className={cn("size-4", isPending && "animate-spin")} />
          {isPending ? "Đang tải..." : "Cập nhật"}
        </Button>

        <Button
          variant="outline"
          onClick={() => exportFinanceCSV(data)}
          disabled={data.revenueTrend.length === 0}
          className="gap-1.5"
        >
          <Download className="size-4" />
          Xuất CSV
        </Button>
      </div>

      {/* ── Tabbed Content ── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-1.5">
            <TrendingUp className="size-4 hidden sm:block" />
            Tổng quan
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <CreditCard className="size-4 hidden sm:block" />
            Thanh toán
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-1.5">
            <Store className="size-4 hidden sm:block" />
            Chi nhánh
          </TabsTrigger>
          <TabsTrigger value="items" className="gap-1.5">
            <UtensilsCrossed className="size-4 hidden sm:block" />
            Món ăn
          </TabsTrigger>
        </TabsList>

        {/* ──────────────── TAB: Tổng quan ──────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Revenue + Tips Area Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5 text-emerald-600" />
                Biểu đồ doanh thu & tip theo ngày
              </CardTitle>
              {data.kpi.totalTips > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Banknote className="size-3" />
                  Tổng tip: {formatVND(data.kpi.totalTips)}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {data.revenueTrend.length === 0 || data.revenueTrend.every((d) => d.revenue === 0) ? (
                <div className="flex h-[350px] items-center justify-center">
                  <p className="text-muted-foreground text-sm">Chưa có dữ liệu doanh thu</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={data.revenueTrend}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="tipsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      interval={data.revenueTrend.length > 15 ? Math.floor(data.revenueTrend.length / 10) : 0}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
                    <Tooltip
                      formatter={(value, name) => [
                        formatVND((value as number) ?? 0),
                        name === "revenue" ? "Doanh thu" : name === "tips" ? "Tip" : "TB/đơn",
                      ]}
                      labelFormatter={(label) => `Ngày ${String(label)}`}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                      name="revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="tips"
                      stroke="hsl(210, 80%, 55%)"
                      strokeWidth={2}
                      fill="url(#tipsGradient)"
                      name="tips"
                    />
                    <Line
                      type="monotone"
                      dataKey="avgTicket"
                      stroke="hsl(45, 90%, 50%)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="avgTicket"
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === "revenue" ? "Doanh thu" : value === "tips" ? "Tip" : "TB/đơn"
                      }
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Order Type */}
          {data.revenueByOrderType.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Doanh thu theo loại đơn</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={data.revenueByOrderType.map((ot) => ({
                          name: ot.label,
                          value: ot.revenue,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={100}
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {data.revenueByOrderType.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatVND((value as number) ?? 0), "Doanh thu"]}
                        contentStyle={TOOLTIP_STYLE}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết loại đơn hàng</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.revenueByOrderType.map((ot, i) => (
                      <div key={ot.type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block size-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <span className="text-sm font-medium">{ot.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm">{formatVND(ot.revenue)}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              ({ot.count} đơn)
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${ot.pctRevenue}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cash Flow Table */}
          {data.revenueTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bảng dòng tiền chi tiết</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                        <TableHead className="text-right">Đơn hàng</TableHead>
                        <TableHead className="text-right">Tip</TableHead>
                        <TableHead className="text-right">TB/đơn</TableHead>
                        <TableHead className="text-right">Tổng thu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.revenueTrend.map((row) => (
                        <TableRow key={row.date}>
                          <TableCell className="font-medium">{row.date}</TableCell>
                          <TableCell className="text-right">{formatVND(row.revenue)}</TableCell>
                          <TableCell className="text-right">{row.orders}</TableCell>
                          <TableCell className="text-right">{formatVND(row.tips)}</TableCell>
                          <TableCell className="text-right">{formatVND(row.avgTicket)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatVND(row.revenue + row.tips)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Tổng cộng</TableCell>
                        <TableCell className="text-right">
                          {formatVND(data.revenueTrend.reduce((s, r) => s + r.revenue, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {data.revenueTrend.reduce((s, r) => s + r.orders, 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatVND(data.revenueTrend.reduce((s, r) => s + r.tips, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatVND(data.kpi.avgOrderValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatVND(
                            data.revenueTrend.reduce((s, r) => s + r.revenue + r.tips, 0),
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ──────────────── TAB: Thanh toán ──────────────── */}
        <TabsContent value="payments" className="space-y-6">
          {data.paymentMethods.length === 0 ? (
            <Card>
              <CardContent className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground text-sm">Chưa có dữ liệu thanh toán</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Donut Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="size-5 text-blue-600" />
                      Phân bổ phương thức thanh toán
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={data.paymentMethods.map((pm) => ({
                            name: pm.label,
                            value: pm.total,
                            count: pm.count,
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={110}
                          label={({ name, percent }: { name?: string; percent?: number }) =>
                            `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {data.paymentMethods.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [formatVND((value as number) ?? 0), "Tổng tiền"]}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Payment Stats Cards */}
                <Card>
                  <CardHeader>
                    <CardTitle>Thống kê chi tiết</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.paymentMethods.map((pm, i) => (
                        <div key={pm.method} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block size-3 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                              />
                              <span className="font-semibold text-sm">{pm.label}</span>
                            </div>
                            <Badge variant="secondary">{pm.pctOfTotal.toFixed(1)}%</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Tổng tiền</p>
                              <p className="font-bold">{formatVND(pm.total)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Giao dịch</p>
                              <p className="font-bold">{pm.count}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">TB/giao dịch</p>
                              <p className="font-bold">{formatVND(pm.avgPerTransaction)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Comparison Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>So sánh phương thức thanh toán</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.paymentMethods}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "total" ? formatVND((value as number) ?? 0) : String((value as number) ?? 0),
                          name === "total" ? "Tổng tiền" : "Số giao dịch",
                        ]}
                        contentStyle={TOOLTIP_STYLE}
                      />
                      <Bar dataKey="total" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} name="total" />
                      <Bar dataKey="count" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="count" />
                      <Legend formatter={(value: string) => (value === "total" ? "Tổng tiền" : "Số giao dịch")} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ──────────────── TAB: Chi nhánh ──────────────── */}
        <TabsContent value="branches" className="space-y-6">
          {data.branchFinance.length === 0 ? (
            <Card>
              <CardContent className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground text-sm">Chưa có dữ liệu chi nhánh</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Branch Revenue Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="size-5 text-violet-600" />
                    So sánh doanh thu chi nhánh
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(250, data.branchFinance.length * 60)}>
                    <BarChart data={data.branchFinance} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
                      <YAxis type="category" dataKey="branchName" width={150} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value, name) => [
                          formatVND((value as number) ?? 0),
                          name === "revenue" ? "Doanh thu" : "Tip",
                        ]}
                        contentStyle={TOOLTIP_STYLE}
                      />
                      <Bar dataKey="revenue" fill="hsl(270, 60%, 55%)" radius={[0, 4, 4, 0]} name="revenue" />
                      <Bar dataKey="tips" fill="hsl(45, 90%, 50%)" radius={[0, 4, 4, 0]} name="tips" />
                      <Legend formatter={(v: string) => (v === "revenue" ? "Doanh thu" : "Tip")} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Branch Details Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Bảng phân tích tài chính chi nhánh</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chi nhánh</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                        <TableHead className="text-right">Đơn hàng</TableHead>
                        <TableHead className="text-right">TB/đơn</TableHead>
                        <TableHead className="text-right">Tip</TableHead>
                        <TableHead>PTTT phổ biến</TableHead>
                        <TableHead className="text-right">% tổng DT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.branchFinance.map((b) => (
                        <TableRow key={b.branchId}>
                          <TableCell className="font-medium">{b.branchName}</TableCell>
                          <TableCell className="text-right font-semibold">{formatVND(b.revenue)}</TableCell>
                          <TableCell className="text-right">{b.orders}</TableCell>
                          <TableCell className="text-right">{formatVND(b.avgTicket)}</TableCell>
                          <TableCell className="text-right">{formatVND(b.tips)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{b.topPaymentMethod}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-2 w-16 rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-violet-500"
                                  style={{ width: `${Math.min(100, b.pctOfTotal)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{b.pctOfTotal.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ──────────────── TAB: Món ăn ──────────────── */}
        <TabsContent value="items" className="space-y-6">
          {data.topRevenueItems.length === 0 ? (
            <Card>
              <CardContent className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground text-sm">Chưa có dữ liệu món ăn</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Top Items Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="size-5 text-amber-600" />
                    Top 15 món có doanh thu cao nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(300, data.topRevenueItems.length * 38)}
                  >
                    <BarChart
                      data={data.topRevenueItems.map((item) => ({
                        ...item,
                        shortName:
                          item.name.length > 25 ? item.name.slice(0, 23) + "…" : item.name,
                      }))}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
                      <YAxis type="category" dataKey="shortName" width={170} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "revenue" ? formatVND((value as number) ?? 0) : String((value as number) ?? 0),
                          name === "revenue" ? "Doanh thu" : "Số lượng",
                        ]}
                        contentStyle={TOOLTIP_STYLE}
                      />
                      <Bar dataKey="revenue" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} name="revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Items Detail Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết doanh thu theo món</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Món</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                        <TableHead className="text-right">SL bán</TableHead>
                        <TableHead className="text-right">Giá TB</TableHead>
                        <TableHead className="text-right">% tổng DT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topRevenueItems.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right font-semibold">{formatVND(item.revenue)}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatVND(item.avgPrice)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-2 w-16 rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{ width: `${Math.min(100, item.pctOfTotal)}%` }}
                                />
                              </div>
                              <span className="text-xs">{item.pctOfTotal.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
