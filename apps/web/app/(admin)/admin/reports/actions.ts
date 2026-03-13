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
// getReportData — Now reads from materialized views
// ---------------------------------------------------------------------------

async function _getReportData(
  startDate: string,
  endDate: string,
): Promise<ReportSummary> {
  const parsed = dateRangeSchema.parse({ startDate, endDate });
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) {
    return emptyReport();
  }

  // --- Query materialized views in parallel ---
  const [revenueResult, paymentMethodsResult, orderTypeMixResult, topItemsResult] =
    await Promise.all([
      // Daily revenue from MV
      supabase
        .from("mv_daily_revenue")
        .select("report_date, order_count, total_revenue, total_tips, avg_ticket")
        .in("branch_id", branchIds)
        .gte("report_date", parsed.startDate)
        .lte("report_date", parsed.endDate),

      // Payment methods from MV
      supabase
        .from("mv_daily_payment_methods")
        .select("method, payment_count, method_total")
        .in("branch_id", branchIds)
        .gte("report_date", parsed.startDate)
        .lte("report_date", parsed.endDate),

      // Order type mix from MV
      supabase
        .from("mv_daily_order_type_mix")
        .select("order_type, type_count, type_revenue")
        .in("branch_id", branchIds)
        .gte("report_date", parsed.startDate)
        .lte("report_date", parsed.endDate),

      // Top items from MV
      supabase
        .from("mv_item_popularity")
        .select("item_name, total_quantity, total_revenue")
        .in("branch_id", branchIds)
        .gte("report_date", parsed.startDate)
        .lte("report_date", parsed.endDate),
    ]);

  if (revenueResult.error) throw safeDbError(revenueResult.error, "db");
  if (paymentMethodsResult.error) throw safeDbError(paymentMethodsResult.error, "db");
  if (orderTypeMixResult.error) throw safeDbError(orderTypeMixResult.error, "db");
  if (topItemsResult.error) throw safeDbError(topItemsResult.error, "db");

  const revenueRows = revenueResult.data ?? [];
  const paymentRows = paymentMethodsResult.data ?? [];
  const orderTypeRows = orderTypeMixResult.data ?? [];
  const itemRows = topItemsResult.data ?? [];

  if (revenueRows.length === 0) return emptyReport();

  // --- Aggregate from MV rows ---

  // Totals (sum across branches + days)
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalTips = 0;

  // Daily breakdown (aggregate across branches per day)
  const dayMap = new Map<string, { revenue: number; orders: number }>();

  // Initialize all days in range
  const [sY = 0, sM = 1, sD = 1] = parsed.startDate.split("-").map(Number);
  const [eY = 0, eM = 1, eD = 1] = parsed.endDate.split("-").map(Number);
  const startDt = new Date(Date.UTC(sY, sM - 1, sD));
  const endDt = new Date(Date.UTC(eY, eM - 1, eD));
  const cursor = new Date(startDt);
  while (cursor <= endDt) {
    dayMap.set(cursor.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const row of revenueRows) {
    const revenue = Number(row.total_revenue);
    const orders = Number(row.order_count);
    const tips = Number(row.total_tips);

    totalRevenue += revenue;
    totalOrders += orders;
    totalTips += tips;

    const dateKey = String(row.report_date);
    const entry = dayMap.get(dateKey);
    if (entry) {
      entry.revenue += revenue;
      entry.orders += orders;
    }
  }

  const dailyData: RevenueReportRow[] = Array.from(dayMap.entries()).map(
    ([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
      avgTicket: data.orders > 0 ? data.revenue / data.orders : 0,
    }),
  );

  // Payment methods (aggregate across branches + days)
  const methodMap = new Map<string, { count: number; total: number }>();
  for (const row of paymentRows) {
    const method = row.method ?? "unknown";
    const entry = methodMap.get(method) ?? { count: 0, total: 0 };
    entry.count += Number(row.payment_count);
    entry.total += Number(row.method_total);
    methodMap.set(method, entry);
  }
  const paymentMethods: PaymentMethodBreakdown[] = Array.from(
    methodMap.entries(),
  ).map(([method, data]) => ({ method, ...data }));

  // Order type mix (aggregate across branches + days)
  const typeMap = new Map<string, { count: number; revenue: number }>();
  for (const row of orderTypeRows) {
    const orderType = row.order_type ?? "unknown";
    const entry = typeMap.get(orderType) ?? { count: 0, revenue: 0 };
    entry.count += Number(row.type_count);
    entry.revenue += Number(row.type_revenue);
    typeMap.set(orderType, entry);
  }
  const orderTypeMix = Array.from(typeMap.entries())
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.count - a.count);

  // Top items (aggregate across branches + days)
  const itemAgg = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const row of itemRows) {
    const name = row.item_name ?? "Không rõ";
    const existing = itemAgg.get(name);
    if (existing) {
      existing.qty += Number(row.total_quantity);
      existing.revenue += Number(row.total_revenue);
    } else {
      itemAgg.set(name, {
        name,
        qty: Number(row.total_quantity),
        revenue: Number(row.total_revenue),
      });
    }
  }
  const topItems = Array.from(itemAgg.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 15);

  // --- Growth vs previous period (from MV) ---
  const periodMs = endDt.getTime() - startDt.getTime();
  const prevStart = new Date(startDt.getTime() - periodMs - 86400000);
  const prevEnd = new Date(startDt.getTime() - 86400000);
  const prevStartStr = prevStart.toISOString().slice(0, 10);
  const prevEndStr = prevEnd.toISOString().slice(0, 10);

  let growthVsPrev: GrowthVsPrev | null = null;

  const { data: prevRows } = await supabase
    .from("mv_daily_revenue")
    .select("order_count, total_revenue")
    .in("branch_id", branchIds)
    .gte("report_date", prevStartStr)
    .lte("report_date", prevEndStr);

  if (prevRows && prevRows.length > 0) {
    let prevRevenue = 0;
    let prevOrders = 0;
    for (const row of prevRows) {
      prevRevenue += Number(row.total_revenue);
      prevOrders += Number(row.order_count);
    }

    const pctChange = (curr: number, prev: number) =>
      prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    const prevAvgTicket = prevOrders > 0 ? prevRevenue / prevOrders : 0;
    const currAvgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    growthVsPrev = {
      revenuePct: pctChange(totalRevenue, prevRevenue),
      ordersPct: pctChange(totalOrders, prevOrders),
      avgTicketPct: pctChange(currAvgTicket, prevAvgTicket),
    };
  }

  return {
    totalRevenue,
    totalOrders,
    avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    totalTips,
    paymentMethods,
    dailyData,
    topItems,
    orderTypeMix,
    growthVsPrev,
  };
}

function emptyReport(): ReportSummary {
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

export const getReportData = withServerQuery(_getReportData);
