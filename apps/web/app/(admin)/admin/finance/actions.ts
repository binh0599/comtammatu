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

// =====================
// Types
// =====================

export interface FinanceKPI {
  todayRevenue: number;
  yesterdayRevenue: number;
  weekRevenue: number;
  prevWeekRevenue: number;
  monthRevenue: number;
  prevMonthRevenue: number;
  todayOrders: number;
  yesterdayOrders: number;
  avgOrderValue: number;
  totalTips: number;
  prevMonthTips: number;
}

export interface DailyRevenuePoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  tips: number;
  avgTicket: number;
}

export interface CashFlowPoint {
  date: string;
  label: string;
  income: number;
  tips: number;
}

export interface PaymentMethodDetail {
  method: string;
  label: string;
  count: number;
  total: number;
  avgPerTransaction: number;
  pctOfTotal: number;
}

export interface BranchFinanceData {
  branchId: number;
  branchName: string;
  revenue: number;
  orders: number;
  avgTicket: number;
  tips: number;
  topPaymentMethod: string;
  pctOfTotal: number;
}

export interface RevenueByOrderType {
  type: string;
  label: string;
  revenue: number;
  count: number;
  pctRevenue: number;
}

export interface TopRevenueItem {
  name: string;
  revenue: number;
  quantity: number;
  avgPrice: number;
  pctOfTotal: number;
}

export interface FinanceDashboardData {
  kpi: FinanceKPI;
  revenueTrend: DailyRevenuePoint[];
  cashFlow: CashFlowPoint[];
  paymentMethods: PaymentMethodDetail[];
  branchFinance: BranchFinanceData[];
  revenueByOrderType: RevenueByOrderType[];
  topRevenueItems: TopRevenueItem[];
}

// =====================
// Payment method labels (Vietnamese)
// =====================

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  ewallet: "Ví điện tử",
  qr: "QR Code",
  transfer: "Chuyển khoản",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: "Tại chỗ",
  takeaway: "Mang đi",
  delivery: "Giao hàng",
};

// =====================
// Main data fetcher
// =====================

async function _getFinanceDashboardData(
  startDate: string,
  endDate: string,
): Promise<FinanceDashboardData> {
  const parsed = dateRangeSchema.parse({ startDate, endDate });
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return emptyDashboard();

  // Fetch branches for names
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (branchError) throw safeDbError(branchError, "db");
  const branchMap = new Map(
    (branches ?? []).map((b: { id: number; name: string }) => [b.id, b.name]),
  );

  // Calculate previous period for comparison
  const [sY = 0, sM = 1, sD = 1] = parsed.startDate.split("-").map(Number);
  const [eY = 0, eM = 1, eD = 1] = parsed.endDate.split("-").map(Number);
  const startDt = new Date(Date.UTC(sY, sM - 1, sD));
  const endDt = new Date(Date.UTC(eY, eM - 1, eD));
  const periodMs = endDt.getTime() - startDt.getTime();
  const prevStart = new Date(startDt.getTime() - periodMs - 86400000);
  const prevEnd = new Date(startDt.getTime() - 86400000);
  const prevStartStr = prevStart.toISOString().slice(0, 10);
  const prevEndStr = prevEnd.toISOString().slice(0, 10);

  // Parallel queries to materialized views
  const [
    revenueResult,
    prevRevenueResult,
    paymentMethodsResult,
    orderTypeMixResult,
    topItemsResult,
  ] = await Promise.all([
    // Current period daily revenue
    supabase
      .from("mv_daily_revenue")
      .select("report_date, branch_id, order_count, total_revenue, total_tips, avg_ticket")
      .in("branch_id", branchIds)
      .gte("report_date", parsed.startDate)
      .lte("report_date", parsed.endDate),
    // Previous period daily revenue (for comparison)
    supabase
      .from("mv_daily_revenue")
      .select("report_date, order_count, total_revenue, total_tips")
      .in("branch_id", branchIds)
      .gte("report_date", prevStartStr)
      .lte("report_date", prevEndStr),
    // Payment methods
    supabase
      .from("mv_daily_payment_methods")
      .select("report_date, branch_id, method, payment_count, method_total")
      .in("branch_id", branchIds)
      .gte("report_date", parsed.startDate)
      .lte("report_date", parsed.endDate),
    // Order type mix
    supabase
      .from("mv_daily_order_type_mix")
      .select("order_type, type_count, type_revenue")
      .in("branch_id", branchIds)
      .gte("report_date", parsed.startDate)
      .lte("report_date", parsed.endDate),
    // Top items by revenue
    supabase
      .from("mv_item_popularity")
      .select("item_name, total_quantity, total_revenue")
      .in("branch_id", branchIds)
      .gte("report_date", parsed.startDate)
      .lte("report_date", parsed.endDate),
  ]);

  if (revenueResult.error) throw safeDbError(revenueResult.error, "db");
  if (prevRevenueResult.error) throw safeDbError(prevRevenueResult.error, "db");
  if (paymentMethodsResult.error) throw safeDbError(paymentMethodsResult.error, "db");
  if (orderTypeMixResult.error) throw safeDbError(orderTypeMixResult.error, "db");
  if (topItemsResult.error) throw safeDbError(topItemsResult.error, "db");

  const revenueRows = revenueResult.data ?? [];
  const prevRevenueRows = prevRevenueResult.data ?? [];
  const paymentRows = paymentMethodsResult.data ?? [];
  const orderTypeRows = orderTypeMixResult.data ?? [];
  const itemRows = topItemsResult.data ?? [];

  // ==================
  // Build KPI
  // ==================
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Current week boundaries (Monday start)
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1));
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  // Previous week
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  const prevWeekStartStr = prevWeekStart.toISOString().slice(0, 10);
  const prevWeekEndStr = prevWeekEnd.toISOString().slice(0, 10);

  // Current month boundaries
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1);
  const prevMonthStartStr = prevMonthStart.toISOString().slice(0, 10);
  const prevMonthEndStr = prevMonthEnd.toISOString().slice(0, 10);

  let todayRevenue = 0, yesterdayRevenue = 0;
  let weekRevenue = 0, prevWeekRevenue = 0;
  let monthRevenue = 0, prevMonthRevenue = 0;
  let todayOrders = 0, yesterdayOrders = 0;
  let totalTips = 0, prevMonthTips = 0;
  let totalRevenue = 0, totalOrders = 0;

  // Aggregate current period
  for (const row of revenueRows) {
    const date = String(row.report_date);
    const revenue = Number(row.total_revenue);
    const orders = Number(row.order_count);
    const tips = Number(row.total_tips);

    totalRevenue += revenue;
    totalOrders += orders;

    if (date === todayStr) { todayRevenue += revenue; todayOrders += orders; }
    if (date === yesterdayStr) { yesterdayRevenue += revenue; yesterdayOrders += orders; }
    if (date >= weekStartStr) weekRevenue += revenue;
    if (date >= monthStartStr) { monthRevenue += revenue; totalTips += tips; }
  }

  // Previous period for comparison
  for (const row of prevRevenueRows) {
    const date = String(row.report_date);
    const revenue = Number(row.total_revenue);
    const tips = Number(row.total_tips);

    if (date >= prevWeekStartStr && date <= prevWeekEndStr) prevWeekRevenue += revenue;
    if (date >= prevMonthStartStr && date <= prevMonthEndStr) {
      prevMonthRevenue += revenue;
      prevMonthTips += tips;
    }
  }

  const kpi: FinanceKPI = {
    todayRevenue,
    yesterdayRevenue,
    weekRevenue,
    prevWeekRevenue,
    monthRevenue,
    prevMonthRevenue,
    todayOrders,
    yesterdayOrders,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    totalTips,
    prevMonthTips,
  };

  // ==================
  // Revenue Trend (daily)
  // ==================
  const dayMap = new Map<string, { revenue: number; orders: number; tips: number }>();
  const cursor = new Date(startDt);
  while (cursor <= endDt) {
    dayMap.set(cursor.toISOString().slice(0, 10), { revenue: 0, orders: 0, tips: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const row of revenueRows) {
    const dateKey = String(row.report_date);
    const entry = dayMap.get(dateKey);
    if (entry) {
      entry.revenue += Number(row.total_revenue);
      entry.orders += Number(row.order_count);
      entry.tips += Number(row.total_tips);
    }
  }

  const revenueTrend: DailyRevenuePoint[] = Array.from(dayMap.entries()).map(
    ([date, data]) => ({
      date,
      label: date.slice(5).replace("-", "/"),
      revenue: data.revenue,
      orders: data.orders,
      tips: data.tips,
      avgTicket: data.orders > 0 ? data.revenue / data.orders : 0,
    }),
  );

  // ==================
  // Cash Flow (daily income + tips)
  // ==================
  const cashFlow: CashFlowPoint[] = revenueTrend.map((d) => ({
    date: d.date,
    label: d.label,
    income: d.revenue,
    tips: d.tips,
  }));

  // ==================
  // Payment Methods
  // ==================
  const methodAgg = new Map<string, { count: number; total: number }>();
  for (const row of paymentRows) {
    const method = row.method ?? "unknown";
    const entry = methodAgg.get(method) ?? { count: 0, total: 0 };
    entry.count += Number(row.payment_count);
    entry.total += Number(row.method_total);
    methodAgg.set(method, entry);
  }

  const totalPaymentAmount = Array.from(methodAgg.values()).reduce((s, v) => s + v.total, 0);

  const paymentMethods: PaymentMethodDetail[] = Array.from(methodAgg.entries())
    .map(([method, data]) => ({
      method,
      label: PAYMENT_LABELS[method] ?? method,
      count: data.count,
      total: data.total,
      avgPerTransaction: data.count > 0 ? data.total / data.count : 0,
      pctOfTotal: totalPaymentAmount > 0 ? (data.total / totalPaymentAmount) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // ==================
  // Branch Finance
  // ==================
  const branchAgg = new Map<number, { revenue: number; orders: number; tips: number }>();
  for (const row of revenueRows) {
    const bid = row.branch_id as number;
    const entry = branchAgg.get(bid) ?? { revenue: 0, orders: 0, tips: 0 };
    entry.revenue += Number(row.total_revenue);
    entry.orders += Number(row.order_count);
    entry.tips += Number(row.total_tips);
    branchAgg.set(bid, entry);
  }

  // Branch top payment method
  const branchPaymentAgg = new Map<number, Map<string, number>>();
  for (const row of paymentRows) {
    const bid = row.branch_id as number;
    const method = row.method ?? "unknown";
    if (!branchPaymentAgg.has(bid)) branchPaymentAgg.set(bid, new Map());
    const methodMap = branchPaymentAgg.get(bid)!;
    methodMap.set(method, (methodMap.get(method) ?? 0) + Number(row.method_total));
  }

  const branchFinance: BranchFinanceData[] = Array.from(branchAgg.entries())
    .map(([bid, data]) => {
      const methodMap = branchPaymentAgg.get(bid);
      let topMethod = "N/A";
      if (methodMap) {
        let maxVal = 0;
        for (const [m, v] of methodMap) {
          if (v > maxVal) { maxVal = v; topMethod = PAYMENT_LABELS[m] ?? m; }
        }
      }
      return {
        branchId: bid,
        branchName: branchMap.get(bid) ?? `Chi nhánh #${bid}`,
        revenue: data.revenue,
        orders: data.orders,
        avgTicket: data.orders > 0 ? data.revenue / data.orders : 0,
        tips: data.tips,
        topPaymentMethod: topMethod,
        pctOfTotal: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // ==================
  // Revenue by Order Type
  // ==================
  const typeAgg = new Map<string, { count: number; revenue: number }>();
  for (const row of orderTypeRows) {
    const type = row.order_type ?? "unknown";
    const entry = typeAgg.get(type) ?? { count: 0, revenue: 0 };
    entry.count += Number(row.type_count);
    entry.revenue += Number(row.type_revenue);
    typeAgg.set(type, entry);
  }

  const totalTypeRevenue = Array.from(typeAgg.values()).reduce((s, v) => s + v.revenue, 0);

  const revenueByOrderType: RevenueByOrderType[] = Array.from(typeAgg.entries())
    .map(([type, data]) => ({
      type,
      label: ORDER_TYPE_LABELS[type] ?? type,
      revenue: data.revenue,
      count: data.count,
      pctRevenue: totalTypeRevenue > 0 ? (data.revenue / totalTypeRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ==================
  // Top Revenue Items
  // ==================
  const itemAgg = new Map<string, { qty: number; revenue: number }>();
  for (const row of itemRows) {
    const name = row.item_name ?? "Không rõ";
    const existing = itemAgg.get(name);
    if (existing) {
      existing.qty += Number(row.total_quantity);
      existing.revenue += Number(row.total_revenue);
    } else {
      itemAgg.set(name, {
        qty: Number(row.total_quantity),
        revenue: Number(row.total_revenue),
      });
    }
  }

  const totalItemRevenue = Array.from(itemAgg.values()).reduce((s, v) => s + v.revenue, 0);

  const topRevenueItems: TopRevenueItem[] = Array.from(itemAgg.entries())
    .map(([name, data]) => ({
      name,
      revenue: data.revenue,
      quantity: data.qty,
      avgPrice: data.qty > 0 ? data.revenue / data.qty : 0,
      pctOfTotal: totalItemRevenue > 0 ? (data.revenue / totalItemRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  return {
    kpi,
    revenueTrend,
    cashFlow,
    paymentMethods,
    branchFinance,
    revenueByOrderType,
    topRevenueItems,
  };
}

function emptyDashboard(): FinanceDashboardData {
  return {
    kpi: {
      todayRevenue: 0, yesterdayRevenue: 0,
      weekRevenue: 0, prevWeekRevenue: 0,
      monthRevenue: 0, prevMonthRevenue: 0,
      todayOrders: 0, yesterdayOrders: 0,
      avgOrderValue: 0, totalTips: 0, prevMonthTips: 0,
    },
    revenueTrend: [],
    cashFlow: [],
    paymentMethods: [],
    branchFinance: [],
    revenueByOrderType: [],
    topRevenueItems: [],
  };
}

export const getFinanceDashboardData = withServerQuery(_getFinanceDashboardData);
