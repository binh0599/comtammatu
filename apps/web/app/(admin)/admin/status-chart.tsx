"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface StatusData {
  status: string;
  label: string;
  count: number;
  color: string;
}

export function StatusChart({ data }: { data: StatusData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="count"
          nameKey="label"
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number | undefined, name: string | undefined) => [
            value ?? 0,
            name ?? "",
          ]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend
          formatter={(value) => <span className="text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
