"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HourlyData {
  hour: string;
  count: number;
}

export function HourlyChart({ data }: { data: HourlyData[] }) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-[250px] items-center justify-center">
        <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="hour" className="text-xs" tick={{ fontSize: 12 }} />
        <YAxis
          className="text-xs"
          tick={{ fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value: number | undefined) => [
            `${value ?? 0} đơn`,
            "Số đơn hàng",
          ]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
