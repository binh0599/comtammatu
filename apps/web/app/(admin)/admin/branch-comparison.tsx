"use client";

import { useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatPrice } from "@comtammatu/shared";
import { getBranchComparison, type BranchComparisonData } from "./actions";
import {
  Button,
  Input,
  Label,
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

type Metric = "revenue" | "orders" | "avgTicket";

const METRIC_LABELS: Record<Metric, string> = {
  revenue: "Doanh thu",
  orders: "Số đơn",
  avgTicket: "Trung bình/đơn",
};

const BRANCH_COLORS = [
  "hsl(210, 80%, 55%)",
  "hsl(150, 70%, 45%)",
  "hsl(45, 90%, 50%)",
  "hsl(0, 70%, 50%)",
  "hsl(270, 60%, 55%)",
  "hsl(30, 80%, 50%)",
];

function formatMetric(value: number, metric: Metric) {
  if (metric === "orders") return value.toLocaleString("vi-VN");
  return formatPrice(value);
}

interface BranchComparisonProps {
  initialData: BranchComparisonData[];
  initialStartDate: string;
  initialEndDate: string;
}

export function BranchComparison({
  initialData,
  initialStartDate,
  initialEndDate,
}: BranchComparisonProps) {
  const [data, setData] = useState(initialData);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [metric, setMetric] = useState<Metric>("revenue");
  const [isPending, startTransition] = useTransition();

  function handleFilter() {
    if (startDate > endDate) return;
    startTransition(async () => {
      const result = await getBranchComparison(startDate, endDate);
      if (Array.isArray(result)) {
        setData(result);
      }
    });
  }

  const chartData = data.map((b, i) => ({
    name: b.branch_name,
    value: b[metric],
    fill: BRANCH_COLORS[i % BRANCH_COLORS.length],
  }));

  const hasData = data.some((b) => b[metric] > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="bc-start">Từ ngày</Label>
          <Input
            id="bc-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="bc-end">Đến ngày</Label>
          <Input
            id="bc-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Chỉ số</Label>
          <Select
            value={metric}
            onValueChange={(v) => setMetric(v as Metric)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Doanh thu</SelectItem>
              <SelectItem value="orders">Số đơn</SelectItem>
              <SelectItem value="avgTicket">TB/đơn</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleFilter} disabled={isPending} size="sm">
          {isPending ? "Đang tải..." : "Áp dụng"}
        </Button>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Chưa có dữ liệu trong khoảng thời gian này
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) =>
                metric === "orders"
                  ? v.toString()
                  : `${(v / 1000).toFixed(0)}k`
              }
            />
            <Tooltip
              formatter={(value) => [
                formatMetric((value as number) ?? 0, metric),
                METRIC_LABELS[metric],
              ]}
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar
              dataKey="value"
              name={METRIC_LABELS[metric]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Summary Table */}
      {data.length > 0 && (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chi nhánh</TableHead>
              <TableHead className="text-right">Doanh thu</TableHead>
              <TableHead className="text-right">Số đơn</TableHead>
              <TableHead className="text-right">TB/đơn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((b) => (
              <TableRow key={b.branch_id}>
                <TableCell className="font-medium">{b.branch_name}</TableCell>
                <TableCell className="text-right">
                  {formatPrice(b.revenue)}
                </TableCell>
                <TableCell className="text-right">{b.orders}</TableCell>
                <TableCell className="text-right">
                  {formatPrice(b.avgTicket)}
                </TableCell>
              </TableRow>
            ))}
            {data.length > 1 && (
              <TableRow className="font-semibold">
                <TableCell>Tổng</TableCell>
                <TableCell className="text-right">
                  {formatPrice(data.reduce((s, b) => s + b.revenue, 0))}
                </TableCell>
                <TableCell className="text-right">
                  {data.reduce((s, b) => s + b.orders, 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatPrice(
                    data.reduce((s, b) => s + b.revenue, 0) /
                      Math.max(1, data.reduce((s, b) => s + b.orders, 0))
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  );
}
