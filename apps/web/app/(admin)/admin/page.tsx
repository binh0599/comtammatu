import dynamic from "next/dynamic";
import { Header } from "@/components/admin/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCards } from "./dashboard-cards";
import { RecentOrders } from "./recent-orders";
import { TopItems } from "./top-items";
import {
  getDashboardStats,
  getRecentOrders,
  getTopSellingItems,
  getOrderStatusCounts,
  getRevenueTrend,
  getHourlyOrderVolume,
  getOrderStatusDistribution,
} from "./actions";

function ChartFallback() {
  return <Skeleton className="h-[300px] w-full" />;
}

const RevenueChart = dynamic(
  () => import("./revenue-chart").then((m) => ({ default: m.RevenueChart })),
  { loading: ChartFallback },
);

const StatusChart = dynamic(
  () => import("./status-chart").then((m) => ({ default: m.StatusChart })),
  { loading: ChartFallback },
);

const HourlyChart = dynamic(
  () => import("./hourly-chart").then((m) => ({ default: m.HourlyChart })),
  { loading: ChartFallback },
);

export default async function AdminDashboard() {
  const [
    stats,
    recentOrders,
    topItems,
    statusCounts,
    revenueTrend,
    hourlyVolume,
    statusDistribution,
  ] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(10),
    getTopSellingItems(10),
    getOrderStatusCounts(),
    getRevenueTrend(7),
    getHourlyOrderVolume(),
    getOrderStatusDistribution(),
  ]);

  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <DashboardCards stats={stats} statusCounts={statusCounts} />

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Doanh thu 7 ngày</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart data={revenueTrend} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Phân bổ trạng thái hôm nay</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusChart data={statusDistribution} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Đơn hàng theo giờ hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            <HourlyChart data={hourlyVolume} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <RecentOrders orders={recentOrders} />
          <TopItems items={topItems} />
        </div>
      </div>
    </>
  );
}
