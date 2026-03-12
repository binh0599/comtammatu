"use server";

import "@/lib/server-bootstrap";
import {
  getAdminContext,
  getBranchIdsForTenant,
  withServerQuery,
  safeDbError,
  ADMIN_ROLES,
  dateRangeSchema,
} from "@comtammatu/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevenueReportRow {
  date: string;
  revenue: number;
  orders: number;
  avgTicket: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  total: number;
}

export interface OrderTypeMixRow {
  type: string;
  count: number;
  revenue: number;
}

export interface GrowthVsPrev {
  revenuePct: number;
  ordersPct: number;
  avgTicketPct: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
  avgTicket: number;
  totalTips: number;
  paymentMethods: PaymentMethodBreakdown[];
  dailyData: RevenueReportRow[];
  topItems: { name: string; qty: number; revenue: number }[];
  orderTypeMix: OrderTypeMixRow[];
  growthVsPrev: GrowthVsPrev | null;
}

// ---------------------------------------------------------------------------
// getReportData
// ---------------------------------------------------------------------------

async function _getReportData(
  startDate: string,
  endDate: string,
): Promise<ReportSummary> {
  const parsed = dateRangeSchema.parse({ startDate, endDate });
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      avgTicket: 0,
      totalTips: 0,
      paymentMethods: [],
      dailyData: [],
      topItems: [],
      orderTypeMix: [],
      growthVsPrev: null,
    };
  }

  const [sY = 0, sM = 1, sD = 1] = parsed.startDate.split("-").map(Number);
  const [eY = 0, eM = 1, eD = 1] = parsed.endDate.split("-").map(Number);
  const start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
  const end = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));

  // Fetch completed orders in range
  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id, branch_id, total, type, created_at, status")
    .in("branch_id", branchIds)
    .eq("status", "completed")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (ordersErr) throw safeDbError(ordersErr, "db");
  if (!orders || orders.length === 0) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      avgTicket: 0,
      totalTips: 0,
      paymentMethods: [],
      dailyData: [],
      topItems: [],
      orderTypeMix: [],
      growthVsPrev: null,
    };
  }

  const orderIds = orders.map((o: { id: number }) => o.id);

  // Fetch payments for these orders
  const { data: payments, error: paymentsErr } = await supabase
    .from("payments")
    .select("order_id, method, amount, tip, paid_at")
    .in("order_id", orderIds)
    .eq("status", "completed")
    .not("paid_at", "is", null);

  if (paymentsErr) throw safeDbError(paymentsErr, "db");

  // Fetch order items for top items
  const { data: orderItems, error: itemsErr } = await supabase
    .from("order_items")
    .select("menu_item_id, quantity, item_total, menu_items(name)")
    .in("order_id", orderIds);

  if (itemsErr) throw safeDbError(itemsErr, "db");

  // --- Aggregate ---

  // Revenue totals
  let totalRevenue = 0;
  let totalTips = 0;
  const methodMap = new Map<string, { count: number; total: number }>();

  for (const p of payments ?? []) {
    const amt = Number(p.amount);
    const tip = Number(p.tip);
    totalRevenue += amt + tip;
    totalTips += tip;
    const entry = methodMap.get(p.method) ?? { count: 0, total: 0 };
    entry.count++;
    entry.total += amt + tip;
    methodMap.set(p.method, entry);
  }

  const paymentMethods: PaymentMethodBreakdown[] = Array.from(
    methodMap.entries(),
  ).map(([method, data]) => ({ method, ...data }));

  // Daily breakdown
  const dayMap = new Map<string, { revenue: number; orders: number }>();

  // Initialize all days in range
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    dayMap.set(key, { revenue: 0, orders: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Count orders per day
  for (const order of orders) {
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    const entry = dayMap.get(key);
    if (entry) entry.orders++;
  }

  // Revenue per day from payments
  for (const p of payments ?? []) {
    const key = new Date(p.paid_at).toISOString().slice(0, 10);
    const entry = dayMap.get(key);
    if (entry) entry.revenue += Number(p.amount) + Number(p.tip);
  }

  const dailyData: RevenueReportRow[] = Array.from(dayMap.entries()).map(
    ([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
      avgTicket: data.orders > 0 ? data.revenue / data.orders : 0,
    }),
  );

  // Top items
  const itemAgg = new Map<number, { name: string; qty: number; revenue: number }>();
  for (const item of orderItems ?? []) {
    const menuItem = item.menu_items as { name: string } | null;
    const name = menuItem?.name ?? "Không rõ";
    const existing = itemAgg.get(item.menu_item_id);
    if (existing) {
      existing.qty += item.quantity;
      existing.revenue += Number(item.item_total);
    } else {
      itemAgg.set(item.menu_item_id, {
        name,
        qty: item.quantity,
        revenue: Number(item.item_total),
      });
    }
  }

  const topItems = Array.from(itemAgg.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 15);

  // --- Order type mix ---
  const typeMap = new Map<string, { count: number; revenue: number }>();
  for (const order of orders) {
    const t = (order as Record<string, unknown>).type as string ?? "dine_in";
    const entry = typeMap.get(t) ?? { count: 0, revenue: 0 };
    entry.count++;
    entry.revenue += Number(order.total);
    typeMap.set(t, entry);
  }
  const orderTypeMix = Array.from(typeMap.entries())
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.count - a.count);

  // --- Growth vs previous period ---
  const periodMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - periodMs - 1);
  const prevEnd = new Date(start.getTime() - 1);

  let growthVsPrev: GrowthVsPrev | null = null;

  const { data: prevOrders } = await supabase
    .from("orders")
    .select("id, total")
    .in("branch_id", branchIds)
    .eq("status", "completed")
    .gte("created_at", prevStart.toISOString())
    .lte("created_at", prevEnd.toISOString());

  if (prevOrders && prevOrders.length > 0) {
    const prevOrderIds = prevOrders.map((o: { id: number }) => o.id);
    const { data: prevPayments } = await supabase
      .from("payments")
      .select("amount, tip")
      .in("order_id", prevOrderIds)
      .eq("status", "completed")
      .not("paid_at", "is", null);

    let prevRevenue = 0;
    for (const p of prevPayments ?? []) {
      prevRevenue += Number(p.amount) + Number(p.tip);
    }
    const prevAvgTicket = prevOrders.length > 0 ? prevRevenue / prevOrders.length : 0;

    const pctChange = (curr: number, prev: number) =>
      prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    growthVsPrev = {
      revenuePct: pctChange(totalRevenue, prevRevenue),
      ordersPct: pctChange(orders.length, prevOrders.length),
      avgTicketPct: pctChange(
        orders.length > 0 ? totalRevenue / orders.length : 0,
        prevAvgTicket,
      ),
    };
  }

  return {
    totalRevenue,
    totalOrders: orders.length,
    avgTicket: orders.length > 0 ? totalRevenue / orders.length : 0,
    totalTips,
    paymentMethods,
    dailyData,
    topItems,
    orderTypeMix,
    growthVsPrev,
  };
}

export const getReportData = withServerQuery(_getReportData);
