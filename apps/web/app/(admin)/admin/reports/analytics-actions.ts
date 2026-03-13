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
// getBranchAnalytics — Now reads from materialized views
// =====================

async function _getBranchAnalytics(
  startDate: string,
  endDate: string,
): Promise<BranchAnalyticsRow[]> {
  const parsed = analyticsQuerySchema.parse({ startDate, endDate });
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // Get branches for display names
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (branchError) throw safeDbError(branchError, "db");
  if (!branches || branches.length === 0) return [];

  const branchIds = branches.map((b: { id: number }) => b.id);

  // Query MVs in parallel: revenue per branch + top category per branch
  const [revenueResult, categoryResult] = await Promise.all([
    supabase
      .from("mv_daily_revenue")
      .select("branch_id, order_count, total_revenue")
      .in("branch_id", branchIds)
      .gte("report_date", parsed.startDate)
      .lte("report_date", parsed.endDate),

    supabase
      .from("mv_item_popularity")
      .select("branch_id, category_name, total_revenue")
      .in("branch_id", branchIds)
      .gte("report_date", parsed.startDate)
      .lte("report_date", parsed.endDate),
  ]);

  if (revenueResult.error) throw safeDbError(revenueResult.error, "db");
  if (categoryResult.error) throw safeDbError(categoryResult.error, "db");

  // Aggregate revenue per branch
  const branchStats = new Map<number, { revenue: number; orders: number }>();
  for (const b of branches) {
    branchStats.set(b.id, { revenue: 0, orders: 0 });
  }

  for (const row of revenueResult.data ?? []) {
    if (row.branch_id == null) continue;
    const stats = branchStats.get(row.branch_id);
    if (stats) {
      stats.revenue += Number(row.total_revenue);
      stats.orders += Number(row.order_count);
    }
  }

  // Aggregate category revenue per branch → find top
  const branchCategories = new Map<number, Map<string, number>>();
  for (const row of categoryResult.data ?? []) {
    if (row.branch_id == null) continue;
    if (!branchCategories.has(row.branch_id)) {
      branchCategories.set(row.branch_id, new Map());
    }
    const catMap = branchCategories.get(row.branch_id)!;
    const catName = row.category_name ?? "Khác";
    catMap.set(catName, (catMap.get(catName) ?? 0) + Number(row.total_revenue));
  }

  return branches.map((b: { id: number; name: string }) => {
    const stats = branchStats.get(b.id) ?? { revenue: 0, orders: 0 };
    const catMap = branchCategories.get(b.id);

    let topCategory = "-";
    if (catMap) {
      let maxRev = 0;
      for (const [cat, rev] of catMap) {
        if (rev > maxRev) {
          maxRev = rev;
          topCategory = cat;
        }
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
// getPeakHoursAnalysis — Now reads from materialized view
// =====================

async function _getPeakHoursAnalysis(
  startDate: string,
  endDate: string,
): Promise<PeakHourCell[]> {
  analyticsQuerySchema.parse({ startDate, endDate });
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return [];

  // Note: mv_peak_hours stores cumulative all-time data (no date range filter).
  // For date-filtered peak hours, we fall back to raw query or accept cumulative.
  // Using MV for now — cumulative pattern is more useful for operational decisions.
  const { data: peakRows, error } = await supabase
    .from("mv_peak_hours")
    .select("day_of_week, hour_of_day, order_count")
    .in("branch_id", branchIds);

  if (error) throw safeDbError(error, "db");

  // Aggregate across branches
  const heatmap = new Map<string, number>();
  for (let d = 0; d < 7; d++) {
    for (let h = 6; h <= 23; h++) {
      heatmap.set(`${d}-${h}`, 0);
    }
  }

  for (const row of peakRows ?? []) {
    const key = `${row.day_of_week}-${row.hour_of_day}`;
    heatmap.set(key, (heatmap.get(key) ?? 0) + Number(row.order_count));
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
// getCategoryMix — Now reads from materialized view
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

  const { data: items, error } = await supabase
    .from("mv_item_popularity")
    .select("category_name, total_quantity, total_revenue")
    .in("branch_id", targetBranchIds)
    .gte("report_date", parsed.startDate)
    .lte("report_date", parsed.endDate);

  if (error) throw safeDbError(error, "db");

  // Aggregate by category across branches + days
  const catMap = new Map<string, { revenue: number; quantity: number }>();
  for (const row of items ?? []) {
    const catName = row.category_name ?? "Khác";
    const entry = catMap.get(catName) ?? { revenue: 0, quantity: 0 };
    entry.revenue += Number(row.total_revenue);
    entry.quantity += Number(row.total_quantity);
    catMap.set(catName, entry);
  }

  return Array.from(catMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
}

export const getCategoryMix = withServerQuery(_getCategoryMix);
