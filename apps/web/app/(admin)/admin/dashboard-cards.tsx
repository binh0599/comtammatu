"use client";

import { DollarSign, ShoppingCart, TrendingUp, Calendar } from "lucide-react";
import { formatPrice, getOrderStatusLabel } from "@comtammatu/shared";
import type { DashboardStats } from "./actions";
import { Badge, StatCard, StatCardGrid } from "@comtammatu/ui";

interface DashboardCardsProps {
  stats: DashboardStats;
  statusCounts: Record<string, number>;
}

const statusVariantMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  cancelled: "destructive",
  confirmed: "outline",
  preparing: "outline",
  ready: "default",
  served: "default",
  completed: "default",
};

const metricCards = (stats: DashboardStats) =>
  [
    {
      title: "Doanh thu hôm nay",
      value: formatPrice(stats.todayRevenue),
      sub: `Trung bình ${formatPrice(stats.avgOrderValue)}/đơn`,
      icon: DollarSign,
      iconClassName: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Đơn hàng hôm nay",
      value: String(stats.todayOrders),
      sub: "đơn hàng",
      icon: ShoppingCart,
      iconClassName: "bg-blue-100 text-blue-700",
    },
    {
      title: "Doanh thu tuần",
      value: formatPrice(stats.weekRevenue),
      sub: "tuần này",
      icon: TrendingUp,
      iconClassName: "bg-violet-100 text-violet-700",
    },
    {
      title: "Doanh thu tháng",
      value: formatPrice(stats.monthRevenue),
      sub: "tháng này",
      icon: Calendar,
      iconClassName: "bg-amber-100 text-amber-700",
    },
  ] as const;

export function DashboardCards({ stats, statusCounts }: DashboardCardsProps) {
  return (
    <div className="space-y-6">
      <StatCardGrid columns={4}>
        {metricCards(stats).map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            sub={card.sub}
            icon={card.icon}
            iconClassName={card.iconClassName}
          />
        ))}
      </StatCardGrid>

      {Object.keys(statusCounts).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">Trạng thái đơn hôm nay:</span>
          {Object.entries(statusCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => (
              <Badge key={status} variant={statusVariantMap[status] ?? "secondary"}>
                {getOrderStatusLabel(status)}: {count}
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}
