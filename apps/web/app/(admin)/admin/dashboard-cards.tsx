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

export function DashboardCards({ stats, statusCounts }: DashboardCardsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Doanh thu hôm nay
            </CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(stats.todayRevenue)}
            </div>
            <p className="text-muted-foreground text-xs">
              Trung bình {formatPrice(stats.avgOrderValue)}/đơn
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Đơn hàng hôm nay
            </CardTitle>
            <ShoppingCart className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
            <p className="text-muted-foreground text-xs">đơn hàng</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Doanh thu tuần
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(stats.weekRevenue)}
            </div>
            <p className="text-muted-foreground text-xs">tuần này</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Doanh thu tháng
            </CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(stats.monthRevenue)}
            </div>
            <p className="text-muted-foreground text-xs">tháng này</p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(statusCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-muted-foreground mr-2 self-center text-sm font-medium">
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
