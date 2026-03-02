"use server";

import { createSupabaseServer } from "@comtammatu/database";

// --- Helper: Get tenant_id from authenticated user ---

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.tenant_id;
  if (!tenantId) throw new Error("No tenant assigned");

  return { supabase, tenantId };
}

// --- Dashboard Stats ---

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  weekRevenue: number;
  monthRevenue: number;
  avgOrderValue: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { supabase, tenantId } = await getTenantId();

  // Get all branch IDs for this tenant
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", tenantId);

  if (branchError) throw new Error(branchError.message);
  if (!branches || branches.length === 0) {
    return {
      todayRevenue: 0,
      todayOrders: 0,
      weekRevenue: 0,
      monthRevenue: 0,
      avgOrderValue: 0,
    };
  }

  const branchIds = branches.map((b) => b.id);

  // Fetch all non-cancelled, non-draft orders for these branches
  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("total, created_at, status")
    .in("branch_id", branchIds)
    .not("status", "in", '("cancelled","draft")');

  if (orderError) throw new Error(orderError.message);
  if (!orders || orders.length === 0) {
    return {
      todayRevenue: 0,
      todayOrders: 0,
      weekRevenue: 0,
      monthRevenue: 0,
      avgOrderValue: 0,
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  if (weekStart > todayStart) weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let todayRevenue = 0;
  let todayOrders = 0;
  let weekRevenue = 0;
  let monthRevenue = 0;
  let totalRevenue = 0;

  for (const order of orders) {
    const orderDate = new Date(order.created_at);
    const total = Number(order.total);

    if (orderDate >= todayStart) {
      todayRevenue += total;
      todayOrders++;
    }
    if (orderDate >= weekStart) {
      weekRevenue += total;
    }
    if (orderDate >= monthStart) {
      monthRevenue += total;
    }
    totalRevenue += total;
  }

  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  return {
    todayRevenue,
    todayOrders,
    weekRevenue,
    monthRevenue,
    avgOrderValue,
  };
}

// --- Recent Orders ---

export interface RecentOrder {
  id: number;
  order_number: string;
  status: string;
  total: number;
  type: string;
  created_at: string;
  tables: { number: number } | null;
}

export async function getRecentOrders(limit = 10): Promise<RecentOrder[]> {
  const { supabase, tenantId } = await getTenantId();

  // Get branch IDs for this tenant
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", tenantId);

  if (branchError) throw new Error(branchError.message);
  if (!branches || branches.length === 0) return [];

  const branchIds = branches.map((b) => b.id);

  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, status, total, type, created_at, tables(number)")
    .in("branch_id", branchIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (orderError) throw new Error(orderError.message);

  return (orders ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    total: Number(o.total),
    type: o.type,
    created_at: o.created_at,
    tables: o.tables as { number: number } | null,
  }));
}

// --- Top Selling Items ---

export interface TopSellingItem {
  name: string;
  total_qty: number;
  total_revenue: number;
}

export async function getTopSellingItems(
  limit = 10,
): Promise<TopSellingItem[]> {
  const { supabase, tenantId } = await getTenantId();

  // Get branch IDs for this tenant
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", tenantId);

  if (branchError) throw new Error(branchError.message);
  if (!branches || branches.length === 0) return [];

  const branchIds = branches.map((b) => b.id);

  // Get completed orders from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: completedOrders, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .in("branch_id", branchIds)
    .eq("status", "completed")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (orderError) throw new Error(orderError.message);
  if (!completedOrders || completedOrders.length === 0) return [];

  const orderIds = completedOrders.map((o) => o.id);

  // Get order items for those orders with menu item names
  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select("menu_item_id, quantity, item_total, menu_items(name)")
    .in("order_id", orderIds);

  if (itemError) throw new Error(itemError.message);
  if (!items || items.length === 0) return [];

  // Aggregate by menu_item_id in JS
  const aggregated = new Map<
    number,
    { name: string; total_qty: number; total_revenue: number }
  >();

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

  // Sort by total_qty descending and take top N
  return Array.from(aggregated.values())
    .sort((a, b) => b.total_qty - a.total_qty)
    .slice(0, limit);
}

// --- Order Status Counts (today) ---

export async function getOrderStatusCounts(): Promise<Record<string, number>> {
  const { supabase, tenantId } = await getTenantId();

  // Get branch IDs for this tenant
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", tenantId);

  if (branchError) throw new Error(branchError.message);
  if (!branches || branches.length === 0) return {};

  const branchIds = branches.map((b) => b.id);

  // Get today's orders
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("status")
    .in("branch_id", branchIds)
    .gte("created_at", todayStart.toISOString());

  if (orderError) throw new Error(orderError.message);
  if (!orders || orders.length === 0) return {};

  // Group by status in JS
  const counts: Record<string, number> = {};
  for (const order of orders) {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
  }

  return counts;
}

// --- Revenue Trend (last N days) ---

export async function getRevenueTrend(days: number = 7) {
  const { supabase, tenantId } = await getTenantId();

  const branchIds =
    (await supabase.from("branches").select("id").eq("tenant_id", tenantId))
      .data?.map((b) => b.id) ?? [];

  if (branchIds.length === 0) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from("orders")
    .select("total, created_at")
    .in("branch_id", branchIds)
    .not("status", "in", '("cancelled","draft")')
    .gte("created_at", startDate.toISOString());

  // Group by date
  const dateMap = new Map<string, { revenue: number; orders: number }>();

  // Initialize all days with 0
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
    dateMap.set(key, { revenue: 0, orders: 0 });
  }

  for (const order of orders ?? []) {
    const d = new Date(order.created_at);
    const key = d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
    const entry = dateMap.get(key);
    if (entry) {
      entry.revenue += Number(order.total);
      entry.orders += 1;
    }
  }

  return Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    orders: data.orders,
  }));
}

// --- Hourly Order Volume (today) ---

export async function getHourlyOrderVolume() {
  const { supabase, tenantId } = await getTenantId();

  const branchIds =
    (await supabase.from("branches").select("id").eq("tenant_id", tenantId))
      .data?.map((b) => b.id) ?? [];

  if (branchIds.length === 0) return [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from("orders")
    .select("created_at")
    .in("branch_id", branchIds)
    .not("status", "in", '("cancelled","draft")')
    .gte("created_at", todayStart.toISOString());

  // Initialize all hours 6-23 with 0
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

// --- Order Status Distribution (today, for pie chart) ---

export async function getOrderStatusDistribution() {
  const { supabase, tenantId } = await getTenantId();

  const branchIds =
    (await supabase.from("branches").select("id").eq("tenant_id", tenantId))
      .data?.map((b) => b.id) ?? [];

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

  const labelMap: Record<string, string> = {
    draft: "Nháp",
    confirmed: "Đã xác nhận",
    preparing: "Đang chuẩn bị",
    ready: "Sẵn sàng",
    served: "Đã phục vụ",
    completed: "Hoàn tất",
    cancelled: "Đã huỷ",
  };

  return Array.from(statusMap.entries())
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      label: labelMap[status] ?? status,
      count,
      color: colorMap[status] ?? "hsl(var(--muted-foreground))",
    }));
}
