import dynamic from "next/dynamic";
import { Header } from "@/components/admin/header";
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
  getBranchComparison,
} from "./actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@comtammatu/ui";

function ChartFallback() {
  return <Skeleton className="h-[300px] w-full" />;
}

const RevenueChart = dynamic(
  () => import("./revenue-chart").then((m) => ({ default: m.RevenueChart })),
  { loading: ChartFallback }
);

const StatusChart = dynamic(
  () => import("./status-chart").then((m) => ({ default: m.StatusChart })),
  { loading: ChartFallback }
);

const HourlyChart = dynamic(
  () => import("./hourly-chart").then((m) => ({ default: m.HourlyChart })),
  { loading: ChartFallback }
);

const BranchComparison = dynamic(
  () =>
    import("./branch-comparison").then((m) => ({
      default: m.BranchComparison,
    })),
  { loading: ChartFallback }
);

export default async function AdminDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [
    stats,
    recentOrders,
    topItems,
    statusCounts,
    revenueTrend,
    hourlyVolume,
    statusDistribution,
    branchData,
  ] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(10),
    getTopSellingItems(10),
    getOrderStatusCounts(),
    getRevenueTrend(7),
    getHourlyOrderVolume(),
    getOrderStatusDistribution(),
    getBranchComparison(monthStart, today),
  ]);

  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-6 p-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="branches">So sánh chi nhánh</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex flex-col gap-6">
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
          </TabsContent>

          <TabsContent value="branches">
            <Card>
              <CardHeader>
                <CardTitle>So sánh chi nhánh</CardTitle>
              </CardHeader>
              <CardContent>
                <BranchComparison
                  initialData={branchData}
                  initialStartDate={monthStart}
                  initialEndDate={today}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
