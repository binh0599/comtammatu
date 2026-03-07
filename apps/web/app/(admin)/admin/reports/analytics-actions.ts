"use server";

import "@/lib/server-bootstrap";
import {
  getAdminContext,
  getBranchIdsForTenant,
  withServerQuery,
  safeDbError,
  ADMIN_ROLES,
  analyticsQuerySchema,
} from "@comtammatu/shared";

// =====================
// Types
// =====================

export interface BranchAnalyticsRow {
  branch_id: number;
  branch_name: string;
  revenue: number;
  orders: number;
  avgTicket: number;
  topCategory: string;
}

export interface PeakHourCell {
  dayOfWeek: number; // 0=Sun..6=Sat
  hour: number;
  count: number;
}

export interface CategoryMixRow {
  category: string;
  revenue: number;
  quantity: number;
}

// =====================
// getBranchAnalytics
// =====================

async function _getBranchAnalytics(
  startDate: string,
  endDate: string,
): Promise<BranchAnalyticsRow[]> {
  const parsed = analyticsQuerySchema.parse({ startDate, endDate });
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (branchError) throw safeDbError(branchError, "db");
  if (!branches || branches.length === 0) return [];

  const branchIds = branches.map((b: { id: number }) => b.id);

  const [sY = 0, sM = 1, sD = 1] = parsed.startDate.split("-").map(Number);
  const [eY = 0, eM = 1, eD = 1] = parsed.endDate.split("-").map(Number);
  const start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
  const end = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id, branch_id, total, created_at")
    .in("branch_id", branchIds)
    .eq("status", "completed")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (ordersErr) throw safeDbError(ordersErr, "db");
  if (!orders || orders.length === 0) {
    return branches.map((b: { id: number; name: string }) => ({
      branch_id: b.id,
      branch_name: b.name,
      revenue: 0,
      orders: 0,
      avgTicket: 0,
      topCategory: "-",
    }));
  }

  const orderIds = orders.map((o: { id: number }) => o.id);

  // Get order items with category info
  const { data: orderItems, error: itemsErr } = await supabase
    .from("order_items")
    .select("order_id, quantity, item_total, menu_items(name, category_id, menu_categories(name))")
    .in("order_id", orderIds);

  if (itemsErr) throw safeDbError(itemsErr, "db");

  // Build order -> branch mapping
  const orderBranch = new Map<number, number>();
  for (const o of orders) {
    orderBranch.set(o.id, o.branch_id);
  }

  // Aggregate per branch
  const branchStats = new Map<
    number,
    { revenue: number; orders: number; categories: Map<string, number> }
  >();

  for (const b of branches) {
    branchStats.set(b.id, { revenue: 0, orders: 0, categories: new Map() });
  }

  for (const o of orders) {
    const stats = branchStats.get(o.branch_id);
    if (stats) {
      stats.revenue += Number(o.total);
      stats.orders += 1;
    }
  }

  // Category aggregation per branch
  for (const item of orderItems ?? []) {
    const branchId = orderBranch.get(item.order_id);
    if (!branchId) continue;
    const stats = branchStats.get(branchId);
    if (!stats) continue;

    const menuItem = item.menu_items as {
      name: string;
      category_id: number | null;
      menu_categories: { name: string } | null;
    } | null;
    const catName = menuItem?.menu_categories?.name ?? "Khac";
    stats.categories.set(
      catName,
      (stats.categories.get(catName) ?? 0) + Number(item.item_total),
    );
  }

  return branches.map((b: { id: number; name: string }) => {
    const stats = branchStats.get(b.id) ?? {
      revenue: 0,
      orders: 0,
      categories: new Map(),
    };

    let topCategory = "-";
    let maxCatRevenue = 0;
    for (const [cat, rev] of stats.categories) {
      if (rev > maxCatRevenue) {
        maxCatRevenue = rev;
        topCategory = cat;
      }
    }

    return {
      branch_id: b.id,
      branch_name: b.name,
      revenue: stats.revenue,
      orders: stats.orders,
      avgTicket: stats.orders > 0 ? stats.revenue / stats.orders : 0,
      topCategory,
    };
  });
}

export const getBranchAnalytics = withServerQuery(_getBranchAnalytics);

// =====================
// getPeakHoursAnalysis
// =====================

async function _getPeakHoursAnalysis(
  startDate: string,
  endDate: string,
): Promise<PeakHourCell[]> {
  const parsed = analyticsQuerySchema.parse({ startDate, endDate });
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return [];

  const [sY = 0, sM = 1, sD = 1] = parsed.startDate.split("-").map(Number);
  const [eY = 0, eM = 1, eD = 1] = parsed.endDate.split("-").map(Number);
  const start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
  const end = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("created_at")
    .in("branch_id", branchIds)
    .not("status", "in", '("cancelled","draft")')
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (ordersErr) throw safeDbError(ordersErr, "db");

  // Build heatmap: dayOfWeek (0-6) x hour (6-23)
  const heatmap = new Map<string, number>();
  for (let d = 0; d < 7; d++) {
    for (let h = 6; h <= 23; h++) {
      heatmap.set(`${d}-${h}`, 0);
    }
  }

  for (const o of orders ?? []) {
    const dt = new Date(o.created_at);
    const dow = dt.getDay();
    const hour = dt.getHours();
    if (hour >= 6 && hour <= 23) {
      const key = `${dow}-${hour}`;
      heatmap.set(key, (heatmap.get(key) ?? 0) + 1);
    }
  }

  const result: PeakHourCell[] = [];
  for (const [key, count] of heatmap) {
    const [d, h] = key.split("-").map(Number);
    result.push({ dayOfWeek: d!, hour: h!, count });
  }

  return result;
}

export const getPeakHoursAnalysis = withServerQuery(_getPeakHoursAnalysis);

// =====================
// getCategoryMix
// =====================

async function _getCategoryMix(
  startDate: string,
  endDate: string,
  branchIds?: number[],
): Promise<CategoryMixRow[]> {
  const parsed = analyticsQuerySchema.parse({ startDate, endDate, branchIds });
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  let targetBranchIds = parsed.branchIds;
  if (!targetBranchIds || targetBranchIds.length === 0) {
    targetBranchIds = await getBranchIdsForTenant(supabase, tenantId);
  }
  if (targetBranchIds.length === 0) return [];

  const [sY = 0, sM = 1, sD = 1] = parsed.startDate.split("-").map(Number);
  const [eY = 0, eM = 1, eD = 1] = parsed.endDate.split("-").map(Number);
  const start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
  const end = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id")
    .in("branch_id", targetBranchIds)
    .eq("status", "completed")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (ordersErr) throw safeDbError(ordersErr, "db");
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o: { id: number }) => o.id);

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("quantity, item_total, menu_items(menu_categories(name))")
    .in("order_id", orderIds);

  if (itemsErr) throw safeDbError(itemsErr, "db");

  const catMap = new Map<string, { revenue: number; quantity: number }>();

  for (const item of items ?? []) {
    const menuItem = item.menu_items as {
      menu_categories: { name: string } | null;
    } | null;
    const catName = menuItem?.menu_categories?.name ?? "Khac";
    const entry = catMap.get(catName) ?? { revenue: 0, quantity: 0 };
    entry.revenue += Number(item.item_total);
    entry.quantity += item.quantity;
    catMap.set(catName, entry);
  }

  return Array.from(catMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
}

export const getCategoryMix = withServerQuery(_getCategoryMix);
