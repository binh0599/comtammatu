"use server";

import "@/lib/server-bootstrap";
import {
  getAdminContext,
  getBranchIdsForTenant,
  withServerQuery,
  getOrderStatusLabel,
  safeDbError,
  ADMIN_ROLES,
} from "@comtammatu/shared";

// =====================
// Dashboard Stats
// =====================

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  weekRevenue: number;
  monthRevenue: number;
  avgOrderValue: number;
}

async function _getDashboardStats(): Promise<DashboardStats> {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) {
    return { todayRevenue: 0, todayOrders: 0, weekRevenue: 0, monthRevenue: 0, avgOrderValue: 0 };
  }

  // Completed orders for order count
  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("id, created_at")
    .in("branch_id", branchIds)
    .eq("status", "completed");

  if (orderError)
    throw safeDbError(orderError, "db");

  const orderIds = (orders ?? []).map((o: { id: number }) => o.id);

  // Completed payments for those orders — actual money collected
  let filteredPayments: { amount: number; tip: number; paid_at: string }[] = [];
  if (orderIds.length > 0) {
    const { data: paymentsData, error: paymentError } = await supabase
      .from("payments")
      .select("amount, tip, paid_at")
      .in("order_id", orderIds)
      .eq("status", "completed")
      .not("paid_at", "is", null);

    if (paymentError)
      throw safeDbError(paymentError, "db");

    filteredPayments = (paymentsData ?? []) as typeof filteredPayments;
  }

  if (filteredPayments.length === 0 && orderIds.length === 0) {
    return { todayRevenue: 0, todayOrders: 0, weekRevenue: 0, monthRevenue: 0, avgOrderValue: 0 };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  if (weekStart > todayStart) weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Count orders by date
  let todayOrders = 0;
  for (const order of orders ?? []) {
    const orderDate = new Date(order.created_at);
    if (orderDate >= todayStart) todayOrders++;
  }

  // Calculate revenue from payments
  let todayRevenue = 0;
  let weekRevenue = 0;
  let monthRevenue = 0;
  let totalRevenue = 0;

  for (const payment of filteredPayments) {
    const paidDate = new Date(payment.paid_at);
    const amount = Number(payment.amount) + Number(payment.tip);

    if (paidDate >= todayStart) todayRevenue += amount;
    if (paidDate >= weekStart) weekRevenue += amount;
    if (paidDate >= monthStart) monthRevenue += amount;
    totalRevenue += amount;
  }

  return {
    todayRevenue,
    todayOrders,
    weekRevenue,
    monthRevenue,
    avgOrderValue: filteredPayments.length > 0 ? totalRevenue / filteredPayments.length : 0,
  };
}

export const getDashboardStats = withServerQuery(_getDashboardStats);

// =====================
// Recent Orders
// =====================

export interface RecentOrder {
  id: number;
  order_number: string;
  status: string;
  total: number;
  type: string;
  created_at: string;
  tables: { number: number } | null;
}

async function _getRecentOrders(limit = 10): Promise<RecentOrder[]> {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return [];

  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, status, total, type, created_at, tables(number)")
    .in("branch_id", branchIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (orderError)
    throw safeDbError(orderError, "db");

  return (orders ?? []).map((o: Record<string, unknown>) => ({
    id: o.id as number,
    order_number: o.order_number as string,
    status: o.status as string,
    total: Number(o.total),
    type: o.type as string,
    created_at: o.created_at as string,
    tables: o.tables as { number: number } | null,
  }));
}

export const getRecentOrders = withServerQuery(_getRecentOrders);

// =====================
// Top Selling Items
// =====================

export interface TopSellingItem {
  name: string;
  total_qty: number;
  total_revenue: number;
}

async function _getTopSellingItems(limit = 10): Promise<TopSellingItem[]> {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: completedOrders, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .in("branch_id", branchIds)
    .eq("status", "completed")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (orderError)
    throw safeDbError(orderError, "db");
  if (!completedOrders || completedOrders.length === 0) return [];

  const orderIds = completedOrders.map((o: { id: number }) => o.id);

  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select("menu_item_id, quantity, item_total, menu_items(name)")
    .in("order_id", orderIds);

  if (itemError)
    throw safeDbError(itemError, "db");
  if (!items || items.length === 0) return [];

  const aggregated = new Map<number, TopSellingItem>();

  for (const item of items) {
    const menuItem = item.menu_items as { name: string } | null;
    const name = menuItem?.name ?? "Không rõ";
    const existing = aggregated.get(item.menu_item_id);

    if (existing) {
      existing.total_qty += item.quantity;
      existing.total_revenue += Number(item.item_total);
    } else {
      aggregated.set(item.menu_item_id, {
        name,
        total_qty: item.quantity,
        total_revenue: Number(item.item_total),
      });
    }
  }

  return Array.from(aggregated.values())
    .sort((a, b) => b.total_qty - a.total_qty)
    .slice(0, limit);
}

export const getTopSellingItems = withServerQuery(_getTopSellingItems);

// =====================
// Order Status Counts (today)
// =====================

async function _getOrderStatusCounts(): Promise<Record<string, number>> {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return {};

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("status")
    .in("branch_id", branchIds)
    .gte("created_at", todayStart.toISOString());

  if (orderError)
    throw safeDbError(orderError, "db");
  if (!orders || orders.length === 0) return {};

  const counts: Record<string, number> = {};
  for (const order of orders) {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
  }

  return counts;
}

export const getOrderStatusCounts = withServerQuery(_getOrderStatusCounts);

// =====================
// Revenue Trend (last N days)
// =====================

async function _getRevenueTrend(days: number = 7) {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  // Get completed orders in date range for order count
  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at")
    .in("branch_id", branchIds)
    .eq("status", "completed")
    .gte("created_at", startDate.toISOString());

  const orderIds = (orders ?? []).map((o: { id: number }) => o.id);

  // Get completed payments for those orders — actual revenue
  let payments: { amount: number; tip: number; paid_at: string }[] = [];
  if (orderIds.length > 0) {
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("amount, tip, paid_at")
      .in("order_id", orderIds)
      .eq("status", "completed")
      .not("paid_at", "is", null);

    payments = (paymentsData ?? []) as typeof payments;
  }

  const dateMap = new Map<string, { revenue: number; orders: number }>();

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    dateMap.set(key, { revenue: 0, orders: 0 });
  }

  // Count orders per day
  for (const order of orders ?? []) {
    const d = new Date(order.created_at);
    const key = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    const entry = dateMap.get(key);
    if (entry) {
      entry.orders += 1;
    }
  }

  // Sum revenue from payments per day
  for (const payment of payments) {
    const d = new Date(payment.paid_at);
    const key = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    const entry = dateMap.get(key);
    if (entry) {
      entry.revenue += Number(payment.amount) + Number(payment.tip);
    }
  }

  return Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    orders: data.orders,
  }));
}

export const getRevenueTrend = withServerQuery(_getRevenueTrend);

// =====================
// Hourly Order Volume (today)
// =====================

async function _getHourlyOrderVolume() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from("orders")
    .select("created_at")
    .in("branch_id", branchIds)
    .not("status", "in", '("cancelled","draft")')
    .gte("created_at", todayStart.toISOString());

  const hourMap = new Map<number, number>();
  for (let h = 6; h <= 23; h++) {
    hourMap.set(h, 0);
  }

  for (const order of orders ?? []) {
    const hour = new Date(order.created_at).getHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }

  return Array.from(hourMap.entries()).map(([hour, count]) => ({
    hour: `${hour}h`,
    count,
  }));
}

export const getHourlyOrderVolume = withServerQuery(_getHourlyOrderVolume);

// =====================
// Order Status Distribution (today, for pie chart)
// =====================

async function _getOrderStatusDistribution() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from("orders")
    .select("status")
    .in("branch_id", branchIds)
    .gte("created_at", todayStart.toISOString());

  const statusMap = new Map<string, number>();
  for (const order of orders ?? []) {
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1);
  }

  const colorMap: Record<string, string> = {
    draft: "hsl(var(--muted-foreground))",
    confirmed: "hsl(210, 80%, 55%)",
    preparing: "hsl(45, 90%, 50%)",
    ready: "hsl(150, 70%, 45%)",
    served: "hsl(170, 60%, 40%)",
    completed: "hsl(142, 76%, 36%)",
    cancelled: "hsl(0, 70%, 50%)",
  };

  return Array.from(statusMap.entries())
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      label: getOrderStatusLabel(status),
      count,
      color: colorMap[status] ?? "hsl(var(--muted-foreground))",
    }));
}

export const getOrderStatusDistribution = withServerQuery(_getOrderStatusDistribution);
