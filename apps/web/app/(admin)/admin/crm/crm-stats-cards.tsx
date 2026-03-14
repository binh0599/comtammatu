"use client";

import { Users, Ticket, Star, MessageCircle } from "lucide-react";
import type { CrmStats } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@comtammatu/ui";

const statCards = (stats: CrmStats) =>
  [
    {
      title: "Khách hàng",
      value: stats.totalCustomers.toLocaleString("vi-VN"),
      sub: `${stats.activeCustomers} đang hoạt động`,
      icon: Users,
      iconClass: "bg-blue-100 text-blue-700",
    },
    {
      title: "Voucher",
      value: stats.totalVouchers.toLocaleString("vi-VN"),
      sub: `${stats.activeVouchers} đang hoạt động`,
      icon: Ticket,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Đánh giá TB",
      value: stats.avgRating > 0 ? `${stats.avgRating}/5` : "—",
      sub: `${stats.totalFeedback} đánh giá`,
      icon: Star,
      iconClass: "bg-amber-100 text-amber-700",
    },
    {
      title: "Phản hồi chờ",
      value: stats.pendingFeedback.toLocaleString("vi-VN"),
      sub: "chưa phản hồi",
      icon: MessageCircle,
      iconClass: "bg-violet-100 text-violet-700",
    },
  ] as const;

export function CrmStatsCards({ stats }: { stats: CrmStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards(stats).map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {card.title}
            </CardTitle>
            <div className={`flex size-8 items-center justify-center rounded-lg ${card.iconClass}`}>
              <card.icon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-muted-foreground mt-1 text-xs">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
