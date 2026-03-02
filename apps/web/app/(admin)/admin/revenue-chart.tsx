"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatPrice } from "@comtammatu/shared";

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export function RevenueChart({ data }: { data: RevenueData[] }) {
  if (data.length === 0 || data.every((d) => d.revenue === 0)) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
        <YAxis
          className="text-xs"
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value: number | undefined) => [
            formatPrice(value ?? 0),
            "Doanh thu",
          ]}
          labelFormatter={(label) => `Ngày ${label}`}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Bar
          dataKey="revenue"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
