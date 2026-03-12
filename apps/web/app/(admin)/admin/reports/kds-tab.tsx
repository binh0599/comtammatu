"use client";

import { useState, useTransition } from "react";
import { CalendarIcon, ChefHat, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
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
  LineChart,
  Line,
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
import {
  getKdsPerformance,
  type KdsPerformanceData,
} from "./kds-actions";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
};

function SlaIndicator({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        value >= 90
          ? "bg-green-100 text-green-700"
          : value >= 70
            ? "bg-yellow-100 text-yellow-700"
            : "bg-red-100 text-red-700",
      )}
    >
      {value >= 90 ? (
        <CheckCircle2 className="size-3" />
      ) : (
        <AlertTriangle className="size-3" />
      )}
      {value}%
    </span>
  );
}

export function KdsTab() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const [startDate, setStartDate] = useState<Date>(weekStart);
  const [endDate, setEndDate] = useState<Date>(now);
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<KdsPerformanceData | null>(null);

  function handleLoad() {
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    startTransition(async () => {
      const result = await getKdsPerformance(start, end);
      setData(result);
    });
  }

  // Prepare chart data
  const chartDailyData = (data?.dailyTrend ?? []).map((row) => ({
    ...row,
    label: row.date.slice(5).replace("-", "/"),
  }));

  return (
    <div className="space-y-6">
      {/* Date range */}
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

        <Button onClick={handleLoad} disabled={isPending}>
          {isPending ? "Đang tải..." : "Xem hiệu suất"}
        </Button>
      </div>

      {!data && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Chọn khoảng thời gian và nhấn &quot;Xem hiệu suất&quot;
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tổng ticket</CardTitle>
                <ChefHat className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalTickets}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Thời gian chế biến TB
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.overallAvgPrep} phút
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">SLA đúng hạn</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <SlaIndicator value={data.overallSla} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Station performance table */}
          {data.stationStats.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Hiệu suất theo bếp</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bếp</TableHead>
                        <TableHead className="text-right">Ticket</TableHead>
                        <TableHead className="text-right">TB chế biến</TableHead>
                        <TableHead className="text-right">TB chờ</TableHead>
                        <TableHead className="text-right">SLA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.stationStats.map((station) => (
                        <TableRow key={station.station_name}>
                          <TableCell className="font-medium">
                            {station.station_name}
                          </TableCell>
                          <TableCell className="text-right">
                            {station.total_tickets}
                          </TableCell>
                          <TableCell className="text-right">
                            {station.avg_prep_time_min}p
                          </TableCell>
                          <TableCell className="text-right">
                            {station.avg_wait_time_min}p
                          </TableCell>
                          <TableCell className="text-right">
                            <SlaIndicator value={station.sla_compliance} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Station comparison bar chart */}
              {data.stationStats.some((s) => s.total_tickets > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>So sánh thời gian chế biến</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.stationStats}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          dataKey="station_name"
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: number) => `${v}p`}
                        />
                        <Tooltip
                          formatter={(value: number | undefined, name: string | undefined) => [
                            `${value ?? 0} phút`,
                            name === "avg_prep_time_min"
                              ? "Chế biến"
                              : "Chờ nhận",
                          ]}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Bar
                          dataKey="avg_wait_time_min"
                          name="Chờ nhận"
                          fill="hsl(45, 90%, 50%)"
                          stackId="time"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="avg_prep_time_min"
                          name="Chế biến"
                          fill="hsl(142, 76%, 36%)"
                          stackId="time"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Daily prep time trend */}
          {chartDailyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng thời gian chế biến theo ngày</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartDailyData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      interval={chartDailyData.length > 15 ? Math.floor(chartDailyData.length / 10) : 0}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `${v}p`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number | undefined, name: string | undefined) => [
                        name === "avg_prep_min"
                          ? `${value ?? 0} phút`
                          : `${value ?? 0} ticket`,
                        name === "avg_prep_min"
                          ? "TB chế biến"
                          : "Số ticket",
                      ]}
                      labelFormatter={(label) => `Ngày ${String(label)}`}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="avg_prep_min"
                      name="avg_prep_min"
                      stroke="hsl(0, 70%, 50%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="tickets"
                      name="tickets"
                      fill="hsl(210, 80%, 55%)"
                      opacity={0.3}
                      radius={[4, 4, 0, 0]}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
