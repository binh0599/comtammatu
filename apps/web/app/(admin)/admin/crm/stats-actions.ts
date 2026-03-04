"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerQuery,
} from "@comtammatu/shared";

// =====================
// CRM Stats
// =====================

export interface CrmStats {
  totalCustomers: number;
  activeCustomers: number;
  totalVouchers: number;
  activeVouchers: number;
  avgRating: number;
  totalFeedback: number;
  pendingFeedback: number;
}

async function _getCrmStats(): Promise<CrmStats> {
  const { supabase, tenantId } = await getActionContext();

  const [customersResult, activeCustomersResult, vouchersResult, activeVouchersResult, feedbackResult, pendingFeedbackResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
    supabase
      .from("vouchers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("vouchers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
    supabase
      .from("customer_feedback")
      .select("rating, branches!inner(tenant_id)")
      .eq("branches.tenant_id", tenantId),
    supabase
      .from("customer_feedback")
      .select("id, branches!inner(tenant_id)", { count: "exact", head: true })
      .is("response", null)
      .eq("branches.tenant_id", tenantId),
  ]);

  const ratings = feedbackResult.data ?? [];
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum: number, r: { rating: number | null }) => sum + (r.rating ?? 0), 0) / ratings.length
    : 0;

  return {
    totalCustomers: customersResult.count ?? 0,
    activeCustomers: activeCustomersResult.count ?? 0,
    totalVouchers: vouchersResult.count ?? 0,
    activeVouchers: activeVouchersResult.count ?? 0,
    avgRating: Math.round(avgRating * 10) / 10,
    totalFeedback: ratings.length,
    pendingFeedback: pendingFeedbackResult.count ?? 0,
  };
}

export const getCrmStats = withServerQuery(_getCrmStats);
