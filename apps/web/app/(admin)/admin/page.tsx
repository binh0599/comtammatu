import { Header } from "@/components/admin/header";
import { DashboardCards } from "./dashboard-cards";
import { RecentOrders } from "./recent-orders";
import { TopItems } from "./top-items";
import {
  getDashboardStats,
  getRecentOrders,
  getTopSellingItems,
  getOrderStatusCounts,
} from "./actions";

export default async function AdminDashboard() {
  const [stats, recentOrders, topItems, statusCounts] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(10),
    getTopSellingItems(10),
    getOrderStatusCounts(),
  ]);

  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <DashboardCards stats={stats} statusCounts={statusCounts} />
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentOrders orders={recentOrders} />
          <TopItems items={topItems} />
        </div>
      </div>
    </>
  );
}
