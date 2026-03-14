"use client";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, cn } from "@comtammatu/ui";
import type { FinanceKPI } from "./actions";

function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function GrowthIndicator({ value }: { value: number | null }) {
  if (value === null) return null;
  const isPositive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        isPositive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
      )}
    >
      {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  growth: number | null;
  icon: React.ElementType;
  iconClassName: string;
  accent?: "emerald" | "blue" | "violet" | "amber" | "rose";
}

function KPICard({
  title,
  value,
  subtitle,
  growth,
  icon: Icon,
  iconClassName,
  accent = "emerald",
}: KPICardProps) {
  const accentBorder: Record<string, string> = {
    emerald: "border-l-emerald-500",
    blue: "border-l-blue-500",
    violet: "border-l-violet-500",
    amber: "border-l-amber-500",
    rose: "border-l-rose-500",
  };

  return (
    <Card className={cn("border-l-4", accentBorder[accent])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("flex size-9 items-center justify-center rounded-lg", iconClassName)}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          <GrowthIndicator value={growth} />
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function FinanceKPICards({ kpi }: { kpi: FinanceKPI }) {
  const cards: KPICardProps[] = [
    {
      title: "Doanh thu hôm nay",
      value: formatVND(kpi.todayRevenue),
      subtitle: `Hôm qua: ${formatVND(kpi.yesterdayRevenue)}`,
      growth: pctChange(kpi.todayRevenue, kpi.yesterdayRevenue),
      icon: DollarSign,
      iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
      accent: "emerald",
    },
    {
      title: "Doanh thu tuần",
      value: formatVND(kpi.weekRevenue),
      subtitle: `Tuần trước: ${formatVND(kpi.prevWeekRevenue)}`,
      growth: pctChange(kpi.weekRevenue, kpi.prevWeekRevenue),
      icon: kpi.weekRevenue >= kpi.prevWeekRevenue ? TrendingUp : TrendingDown,
      iconClassName: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      accent: "blue",
    },
    {
      title: "Doanh thu tháng",
      value: formatVND(kpi.monthRevenue),
      subtitle: `Tháng trước: ${formatVND(kpi.prevMonthRevenue)}`,
      growth: pctChange(kpi.monthRevenue, kpi.prevMonthRevenue),
      icon: Wallet,
      iconClassName: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
      accent: "violet",
    },
    {
      title: "Đơn hàng hôm nay",
      value: String(kpi.todayOrders),
      subtitle: `Hôm qua: ${kpi.yesterdayOrders} | TB: ${formatVND(kpi.avgOrderValue)}/đơn`,
      growth: pctChange(kpi.todayOrders, kpi.yesterdayOrders),
      icon: ShoppingCart,
      iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
      accent: "amber",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <KPICard key={card.title} {...card} />
      ))}
    </div>
  );
}
