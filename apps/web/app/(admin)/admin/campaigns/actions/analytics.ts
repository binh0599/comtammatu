"use server";

import "@/lib/server-bootstrap";
import {
  ADMIN_ROLES,
  getAdminContext,
  withServerQuery,
  safeDbError,
  entityIdSchema,
} from "@comtammatu/shared";

const validateId = (id: number) => entityIdSchema.parse(id);

// =====================
// Campaign Analytics
// =====================

export interface CampaignAnalytics {
  total_sent: number;
  total_opened: number;
  total_converted: number;
  conversion_revenue: number;
  open_rate: number;
  conversion_rate: number;
}

async function _getCampaignAnalytics(campaignId: number): Promise<CampaignAnalytics> {
  validateId(campaignId);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // Verify campaign belongs to tenant
  const { data: campaign, error: campError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("tenant_id", tenantId)
    .single();

  if (campError || !campaign) {
    throw new Error("Chiến dịch không tồn tại");
  }

  // Get recipient counts by status
  const { data: recipients, error: recError } = await supabase
    .from("campaign_recipients")
    .select("status, conversion_order_id")
    .eq("campaign_id", campaignId);

  if (recError) throw safeDbError(recError, "db");

  const all: { status: string; conversion_order_id: number | null }[] = recipients ?? [];
  const totalSent = all.length;
  const totalOpened = all.filter((r) => r.status === "opened" || r.status === "clicked" || r.status === "converted").length;
  const convertedRecipients = all.filter((r) => r.status === "converted");
  const totalConverted = convertedRecipients.length;

  // Get conversion revenue from linked orders
  let conversionRevenue = 0;
  const orderIds = convertedRecipients
    .map((r) => r.conversion_order_id)
    .filter((id): id is number => id != null);

  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("total")
      .in("id", orderIds);

    if (orders) {
      conversionRevenue = (orders as { total: number | null }[]).reduce(
        (sum: number, o) => sum + Number(o.total ?? 0),
        0,
      );
    }
  }

  return {
    total_sent: totalSent,
    total_opened: totalOpened,
    total_converted: totalConverted,
    conversion_revenue: Math.round(conversionRevenue),
    open_rate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
    conversion_rate: totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0,
  };
}

export const getCampaignAnalytics = withServerQuery(_getCampaignAnalytics);
