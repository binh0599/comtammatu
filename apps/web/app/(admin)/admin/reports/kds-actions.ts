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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StationStat {
  station_name: string;
  total_tickets: number;
  avg_prep_time_min: number;
  avg_wait_time_min: number;
  sla_compliance: number; // 0-100
}

export interface KdsDailyTrend {
  date: string;
  tickets: number;
  avg_prep_min: number;
}

export interface KdsPerformanceData {
  stationStats: StationStat[];
  dailyTrend: KdsDailyTrend[];
  totalTickets: number;
  overallAvgPrep: number;
  overallSla: number;
}

// ---------------------------------------------------------------------------
// getKdsPerformance
// ---------------------------------------------------------------------------

async function _getKdsPerformance(
  startDate: string,
  endDate: string,
): Promise<KdsPerformanceData> {
  const parsed = analyticsQuerySchema.parse({ startDate, endDate });
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) {
    return {
      stationStats: [],
      dailyTrend: [],
      totalTickets: 0,
      overallAvgPrep: 0,
      overallSla: 0,
    };
  }

  const [sY = 0, sM = 1, sD = 1] = parsed.startDate.split("-").map(Number);
  const [eY = 0, eM = 1, eD = 1] = parsed.endDate.split("-").map(Number);
  const start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
  const end = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));

  // Fetch stations for these branches
  const { data: stations, error: stationsErr } = await supabase
    .from("kds_stations")
    .select("id, name, branch_id")
    .in("branch_id", branchIds)
    .eq("is_active", true);

  if (stationsErr) throw safeDbError(stationsErr, "db");
  if (!stations || stations.length === 0) {
    return {
      stationStats: [],
      dailyTrend: [],
      totalTickets: 0,
      overallAvgPrep: 0,
      overallSla: 0,
    };
  }

  const stationIds = stations.map((s: { id: number }) => s.id);
  const stationNameMap = new Map(
    stations.map((s: { id: number; name: string }) => [s.id, s.name]),
  );

  // Fetch completed tickets in date range
  const { data: tickets, error: ticketsErr } = await supabase
    .from("kds_tickets")
    .select("id, station_id, status, created_at, accepted_at, completed_at")
    .in("station_id", stationIds)
    .eq("status", "ready")
    .not("completed_at", "is", null)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (ticketsErr) throw safeDbError(ticketsErr, "db");
  if (!tickets || tickets.length === 0) {
    return {
      stationStats: stations.map((s: { id: number; name: string }) => ({
        station_name: s.name,
        total_tickets: 0,
        avg_prep_time_min: 0,
        avg_wait_time_min: 0,
        sla_compliance: 100,
      })),
      dailyTrend: [],
      totalTickets: 0,
      overallAvgPrep: 0,
      overallSla: 0,
    };
  }

  // Fetch timing rules for SLA comparison
  const { data: timingRules } = await supabase
    .from("kds_timing_rules")
    .select("station_id, prep_time_min")
    .in("station_id", stationIds);

  // Build station → prep_time_min map (use first rule per station)
  const slaMap = new Map<number, number>();
  for (const rule of timingRules ?? []) {
    if (!slaMap.has(rule.station_id)) {
      slaMap.set(rule.station_id, rule.prep_time_min);
    }
  }

  // --- Aggregate per station ---
  const stationAgg = new Map<
    number,
    { prepTimes: number[]; waitTimes: number[]; slaHits: number }
  >();

  for (const s of stations) {
    stationAgg.set(s.id, { prepTimes: [], waitTimes: [], slaHits: 0 });
  }

  // --- Aggregate per day ---
  const dayAgg = new Map<string, { count: number; prepSum: number }>();

  let totalPrepSum = 0;
  let totalSlaHits = 0;

  for (const ticket of tickets) {
    const agg = stationAgg.get(ticket.station_id);
    if (!agg) continue;

    const createdAt = new Date(ticket.created_at).getTime();
    const acceptedAt = ticket.accepted_at
      ? new Date(ticket.accepted_at).getTime()
      : createdAt;
    const completedAt = new Date(ticket.completed_at).getTime();

    const prepMin = (completedAt - acceptedAt) / 60_000;
    const waitMin = (acceptedAt - createdAt) / 60_000;

    // Sanity check: ignore negative or absurdly large values
    if (prepMin >= 0 && prepMin < 600) {
      agg.prepTimes.push(prepMin);
      totalPrepSum += prepMin;
    }
    if (waitMin >= 0 && waitMin < 600) {
      agg.waitTimes.push(waitMin);
    }

    // SLA check
    const slaLimit = slaMap.get(ticket.station_id) ?? 15; // default 15 min
    if (prepMin <= slaLimit) {
      agg.slaHits++;
      totalSlaHits++;
    }

    // Daily aggregation
    const dayKey = new Date(ticket.created_at).toISOString().slice(0, 10);
    const dayEntry = dayAgg.get(dayKey) ?? { count: 0, prepSum: 0 };
    dayEntry.count++;
    if (prepMin >= 0 && prepMin < 600) {
      dayEntry.prepSum += prepMin;
    }
    dayAgg.set(dayKey, dayEntry);
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const stationStats: StationStat[] = stations.map(
    (s: { id: number; name: string }) => {
      const agg = stationAgg.get(s.id)!;
      const total = agg.prepTimes.length;
      return {
        station_name: s.name,
        total_tickets: total,
        avg_prep_time_min: Math.round(avg(agg.prepTimes) * 10) / 10,
        avg_wait_time_min: Math.round(avg(agg.waitTimes) * 10) / 10,
        sla_compliance:
          total > 0 ? Math.round((agg.slaHits / total) * 100) : 100,
      };
    },
  );

  const dailyTrend: KdsDailyTrend[] = Array.from(dayAgg.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      tickets: d.count,
      avg_prep_min:
        d.count > 0 ? Math.round((d.prepSum / d.count) * 10) / 10 : 0,
    }));

  return {
    stationStats,
    dailyTrend,
    totalTickets: tickets.length,
    overallAvgPrep:
      tickets.length > 0
        ? Math.round((totalPrepSum / tickets.length) * 10) / 10
        : 0,
    overallSla:
      tickets.length > 0
        ? Math.round((totalSlaHits / tickets.length) * 100)
        : 100,
  };
}

export const getKdsPerformance = withServerQuery(_getKdsPerformance);
