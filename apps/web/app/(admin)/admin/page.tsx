import { Header } from "@/components/admin/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardCards } from "./dashboard-cards";
import { RecentOrders } from "./recent-orders";
import { TopItems } from "./top-items";
import { RevenueChart } from "./revenue-chart";
import { StatusChart } from "./status-chart";
import { HourlyChart } from "./hourly-chart";
import {
  getDashboardStats,
  getRecentOrders,
  getTopSellingItems,
  getOrderStatusCounts,
  getRevenueTrend,
  getHourlyOrderVolume,
  getOrderStatusDistribution,
} from "./actions";

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
