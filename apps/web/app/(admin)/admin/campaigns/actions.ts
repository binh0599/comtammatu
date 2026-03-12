"use server";

import "@/lib/server-bootstrap";
import {
  ADMIN_ROLES,
  getAdminContext,
  withServerAction,
  withServerQuery,
  safeDbError,
  safeDbErrorResult,
  auditLog,
  createCampaignSchema,
  updateCampaignSchema,
  entityIdSchema,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendPushToUser } from "@/lib/push-sender";

const CAMPAIGNS_PATH = "/admin/campaigns";

const validateId = (id: number) => entityIdSchema.parse(id);

// =====================
// Queries
// =====================

async function _getCampaigns() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getCampaigns = withServerQuery(_getCampaigns);

async function _getCampaign(id: number) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) throw safeDbError(error, "db");
  return data;
}

export const getCampaign = withServerQuery(_getCampaign);

// =====================
// Mutations
// =====================

async function _createCampaign(input: {
  name: string;
  type: string;
  content: { subject?: string; body: string; cta_url?: string };
  target_segment?: {
    loyalty_tier_ids?: number[];
    min_total_spent?: number;
    min_visits?: number;
    gender?: string;
  };
  scheduled_at?: string;
}) {
  const parsed = createCampaignSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      type: parsed.data.type,
      content: parsed.data.content,
      target_segment: parsed.data.target_segment ?? {},
      scheduled_at: parsed.data.scheduled_at || null,
      status: "draft",
      sent_count: 0,
    })
    .select("id")
    .single();

  if (error) return safeDbErrorResult(error, "db");

  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "campaign_created",
    resource_type: "campaign",
    resource_id: campaign.id,
    changes: { name: parsed.data.name, type: parsed.data.type },
  });

  revalidatePath(CAMPAIGNS_PATH);
  return { error: null, success: true };
}

export const createCampaign = withServerAction(_createCampaign);

async function _updateCampaign(
  id: number,
  input: {
    name?: string;
    type?: string;
    content?: { subject?: string; body?: string; cta_url?: string };
    target_segment?: {
      loyalty_tier_ids?: number[];
      min_total_spent?: number;
      min_visits?: number;
      gender?: string;
    };
    scheduled_at?: string;
  },
) {
  validateId(id);
  const parsed = updateCampaignSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  // Verify ownership + only allow editing drafts/scheduled
  const { data: existing, error: fetchError } = await supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return { error: "Chiến dịch không tồn tại" };
  }

  if (existing.status === "sent" || existing.status === "completed") {
    return { error: "Không thể chỉnh sửa chiến dịch đã gửi" };
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
  if (parsed.data.target_segment !== undefined)
    updateData.target_segment = parsed.data.target_segment;
  if (parsed.data.scheduled_at !== undefined)
    updateData.scheduled_at = parsed.data.scheduled_at || null;

  const { error } = await supabase
    .from("campaigns")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "campaign_updated",
    resource_type: "campaign",
    resource_id: id,
    changes: updateData,
  });

  revalidatePath(CAMPAIGNS_PATH);
  return { error: null, success: true };
}

export const updateCampaign = withServerAction(_updateCampaign);

async function _deleteCampaign(id: number) {
  validateId(id);
  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  // Only allow deleting drafts
  const { data: existing, error: fetchError } = await supabase
    .from("campaigns")
    .select("id, status, name")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return { error: "Chiến dịch không tồn tại" };
  }

  if (existing.status !== "draft") {
    return { error: "Chỉ có thể xóa chiến dịch nháp" };
  }

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "campaign_deleted",
    resource_type: "campaign",
    resource_id: id,
    changes: { name: existing.name },
  });

  revalidatePath(CAMPAIGNS_PATH);
  return { error: null, success: true };
}

export const deleteCampaign = withServerAction(_deleteCampaign);

const scheduleCampaignSchema = z.object({
  id: entityIdSchema,
  scheduled_at: z.string().datetime("Thời gian không hợp lệ"),
});

async function _scheduleCampaign(id: number, scheduledAt: string) {
  const parsed = scheduleCampaignSchema.safeParse({ id, scheduled_at: scheduledAt });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", parsed.data.id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return { error: "Chiến dịch không tồn tại" };
  }

  if (existing.status !== "draft") {
    return { error: "Chỉ có thể lên lịch chiến dịch nháp" };
  }

  const { error } = await supabase
    .from("campaigns")
    .update({
      status: "scheduled",
      scheduled_at: parsed.data.scheduled_at,
    })
    .eq("id", parsed.data.id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "campaign_scheduled",
    resource_type: "campaign",
    resource_id: parsed.data.id,
    changes: { scheduled_at: parsed.data.scheduled_at },
  });

  revalidatePath(CAMPAIGNS_PATH);
  return { error: null, success: true };
}

export const scheduleCampaign = withServerAction(_scheduleCampaign);

async function _sendCampaign(id: number) {
  validateId(id);
  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("campaigns")
    .select("id, status, target_segment, name, message")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return { error: "Chiến dịch không tồn tại" };
  }

  if (existing.status !== "scheduled") {
    return { error: "Chỉ có thể gửi chiến dịch đã lên lịch" };
  }

  // Count matching customers from target_segment
  let query = supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  const segment = existing.target_segment as {
    loyalty_tier_ids?: number[];
    min_total_spent?: number;
    min_visits?: number;
    gender?: string;
  } | null;

  if (segment) {
    if (segment.loyalty_tier_ids && segment.loyalty_tier_ids.length > 0) {
      query = query.in("loyalty_tier_id", segment.loyalty_tier_ids);
    }
    if (segment.min_total_spent !== undefined && segment.min_total_spent > 0) {
      query = query.gte("total_spent", segment.min_total_spent);
    }
    if (segment.min_visits !== undefined && segment.min_visits > 0) {
      query = query.gte("visit_count", segment.min_visits);
    }
    if (segment.gender) {
      query = query.eq("gender", segment.gender);
    }
  }

  const { count, error: countError } = await query;

  if (countError) return safeDbErrorResult(countError, "db");

  const sentCount = count ?? 0;

  const { error } = await supabase
    .from("campaigns")
    .update({
      status: "sent",
      sent_count: sentCount,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "campaign_sent",
    resource_type: "campaign",
    resource_id: id,
    changes: { sent_count: sentCount },
  });

  // Fetch matching customers (with IDs) for recipient tracking + push
  if (sentCount > 0) {
    let recipientQuery = supabase
      .from("customers")
      .select("id, user_id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .limit(500);

    if (segment) {
      if (segment.loyalty_tier_ids && segment.loyalty_tier_ids.length > 0) {
        recipientQuery = recipientQuery.in("loyalty_tier_id", segment.loyalty_tier_ids);
      }
      if (segment.min_total_spent !== undefined && segment.min_total_spent > 0) {
        recipientQuery = recipientQuery.gte("total_spent", segment.min_total_spent);
      }
      if (segment.min_visits !== undefined && segment.min_visits > 0) {
        recipientQuery = recipientQuery.gte("visit_count", segment.min_visits);
      }
      if (segment.gender) {
        recipientQuery = recipientQuery.eq("gender", segment.gender);
      }
    }

    void recipientQuery.then(({ data: customers }: { data: { id: number; user_id: string | null }[] | null }) => {
      if (!customers || customers.length === 0) return;

      // Bulk insert campaign_recipients for analytics tracking
      const recipientRows = customers.map((c) => ({
        campaign_id: id,
        customer_id: c.id,
        status: "sent" as const,
      }));

      void supabase.from("campaign_recipients").insert(recipientRows);

      // Send push notifications (fire-and-forget)
      for (const c of customers) {
        if (c.user_id) {
          void sendPushToUser(c.user_id, {
            title: existing.name ?? "Ưu đãi mới",
            body: (existing.message as string) ?? "Bạn có ưu đãi mới!",
            type: "campaign",
          }, "campaign");
        }
      }
    });
  }

  revalidatePath(CAMPAIGNS_PATH);
  return { error: null, success: true, sent_count: sentCount };
}

export const sendCampaign = withServerAction(_sendCampaign);

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
