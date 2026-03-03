"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShoppingCart, TrendingUp, Calendar } from "lucide-react";
import { formatPrice, getOrderStatusLabel } from "@comtammatu/shared";
import type { DashboardStats } from "./actions";

interface DashboardCardsProps {
  stats: DashboardStats;
  statusCounts: Record<string, number>;
}

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  cancelled: "destructive",
  confirmed: "outline",
  preparing: "outline",
  ready: "default",
  served: "default",
  completed: "default",
};

const metricCards = (stats: DashboardStats) => [
  {
    title: "Doanh thu hôm nay",
    value: formatPrice(stats.todayRevenue),
    sub: `Trung bình ${formatPrice(stats.avgOrderValue)}/đơn`,
    icon: DollarSign,
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Đơn hàng hôm nay",
    value: String(stats.todayOrders),
    sub: "đơn hàng",
    icon: ShoppingCart,
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    title: "Doanh thu tuần",
    value: formatPrice(stats.weekRevenue),
    sub: "tuần này",
    icon: TrendingUp,
    iconClass: "bg-violet-100 text-violet-700",
  },
  {
    title: "Doanh thu tháng",
    value: formatPrice(stats.monthRevenue),
    sub: "tháng này",
    icon: Calendar,
    iconClass: "bg-amber-100 text-amber-700",
  },
] as const;

export function DashboardCards({ stats, statusCounts }: DashboardCardsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards(stats).map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`flex size-8 items-center justify-center rounded-lg ${card.iconClass}`}>
                <card.icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-muted-foreground text-xs mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(statusCounts).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">
            Trạng thái đơn hôm nay:
          </span>
          {Object.entries(statusCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => (
              <Badge
                key={status}
                variant={statusVariantMap[status] ?? "secondary"}
              >
                {getOrderStatusLabel(status)}: {count}
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}
