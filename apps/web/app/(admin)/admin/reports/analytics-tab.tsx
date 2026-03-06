"use client";

import { useState, useTransition } from "react";
import { CalendarIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatPrice } from "@comtammatu/shared";
import {
  getBranchAnalytics,
  getPeakHoursAnalysis,
  getCategoryMix,
  type BranchAnalyticsRow,
  type PeakHourCell,
  type CategoryMixRow,
} from "./analytics-actions";

function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

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

function getHeatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-muted";
  const ratio = value / max;
  if (ratio > 0.75) return "bg-red-500 text-white";
  if (ratio > 0.5) return "bg-orange-400 text-white";
  if (ratio > 0.25) return "bg-yellow-300 text-yellow-900";
  return "bg-green-200 text-green-900";
}

export function AnalyticsTab() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [startDate, setStartDate] = useState<Date>(monthStart);
  const [endDate, setEndDate] = useState<Date>(now);
  const [isPending, startTransition] = useTransition();

  const [branchData, setBranchData] = useState<BranchAnalyticsRow[]>([]);
  const [peakData, setPeakData] = useState<PeakHourCell[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryMixRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  function handleLoad() {
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    startTransition(async () => {
      const [branches, peaks, categories] = await Promise.all([
        getBranchAnalytics(start, end),
        getPeakHoursAnalysis(start, end),
        getCategoryMix(start, end),
      ]);
      setBranchData(branches);
      setPeakData(peaks);
      setCategoryData(categories);
      setLoaded(true);
    });
  }

  const maxPeak = Math.max(...peakData.map((p) => p.count), 0);

  return (
    <div className="space-y-6">
      {/* Date range selector */}
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

        <span className="text-muted-foreground">den</span>

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

        <Button onClick={handleLoad} disabled={isPending}>
          {isPending ? "Dang tai..." : "Xem phan tich"}
        </Button>
      </div>

      {!loaded && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Chon khoang thoi gian va nhan &quot;Xem phan tich&quot;
          </p>
        </div>
      )}

      {loaded && (
        <>
          {/* Branch performance table */}
          <Card>
            <CardHeader>
              <CardTitle>Hieu suat theo chi nhanh</CardTitle>
            </CardHeader>
            <CardContent>
              {branchData.length === 0 ? (
                <p className="text-muted-foreground text-sm">Khong co du lieu</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chi nhanh</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                        <TableHead className="text-right">Don hang</TableHead>
                        <TableHead className="text-right">TB/don</TableHead>
                        <TableHead>Danh muc ban chay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchData.map((row) => (
                        <TableRow key={row.branch_id}>
                          <TableCell className="font-medium">
                            {row.branch_name}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatVND(row.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.orders}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatVND(row.avgTicket)}
                          </TableCell>
                          <TableCell>{row.topCategory}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Branch revenue bar chart */}
                  {branchData.some((b) => b.revenue > 0) && (
                    <div className="mt-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={branchData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="branch_name"
                            className="text-xs"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            className="text-xs"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            formatter={(value: number | undefined) => [
                              formatVND(value ?? 0),
                              "Doanh thu",
                            ]}
                            contentStyle={{
                              backgroundColor: "var(--color-card)",
                              border: "1px solid var(--color-border)",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar
                            dataKey="revenue"
                            fill="var(--color-primary)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Peak hours heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Gio cao diem (Heatmap)</CardTitle>
            </CardHeader>
            <CardContent>
              {peakData.length === 0 ? (
                <p className="text-muted-foreground text-sm">Khong co du lieu</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="p-1 text-left font-medium">Gio</th>
                        {DAY_LABELS.map((d) => (
                          <th key={d} className="p-1 text-center font-medium">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 18 }, (_, i) => i + 6).map(
                        (hour) => (
                          <tr key={hour}>
                            <td className="p-1 font-medium">{hour}h</td>
                            {Array.from({ length: 7 }, (_, dow) => {
                              const cell = peakData.find(
                                (p) => p.dayOfWeek === dow && p.hour === hour,
                              );
                              const count = cell?.count ?? 0;
                              return (
                                <td
                                  key={dow}
                                  className={cn(
                                    "p-1 text-center rounded-sm min-w-[32px]",
                                    getHeatColor(count, maxPeak),
                                  )}
                                  title={`${DAY_LABELS[dow]} ${hour}h: ${count} don`}
                                >
                                  {count > 0 ? count : ""}
                                </td>
                              );
                            })}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>It</span>
                    <span className="inline-block h-3 w-4 rounded-sm bg-green-200" />
                    <span className="inline-block h-3 w-4 rounded-sm bg-yellow-300" />
                    <span className="inline-block h-3 w-4 rounded-sm bg-orange-400" />
                    <span className="inline-block h-3 w-4 rounded-sm bg-red-500" />
                    <span>Nhieu</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category mix */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Doanh thu theo danh muc</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Khong co du lieu
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="revenue"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {categoryData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) => [
                          formatVND(value ?? 0),
                          "Doanh thu",
                        ]}
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chi tiet danh muc</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Khong co du lieu
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Danh muc</TableHead>
                        <TableHead className="text-right">So luong</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryData.map((row) => (
                        <TableRow key={row.category}>
                          <TableCell className="font-medium">
                            {row.category}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatVND(row.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
