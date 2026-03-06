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
    return { error: parsed.error.issues[0]?.message ?? "Du lieu khong hop le" };
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
    return { error: parsed.error.issues[0]?.message ?? "Du lieu khong hop le" };
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
    return { error: "Chien dich khong ton tai" };
  }

  if (existing.status === "sent" || existing.status === "completed") {
    return { error: "Khong the chinh sua chien dich da gui" };
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
    return { error: "Chien dich khong ton tai" };
  }

  if (existing.status !== "draft") {
    return { error: "Chi co the xoa chien dich nhap" };
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
  scheduled_at: z.string().datetime("Thoi gian khong hop le"),
});

async function _scheduleCampaign(id: number, scheduledAt: string) {
  const parsed = scheduleCampaignSchema.safeParse({ id, scheduled_at: scheduledAt });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Du lieu khong hop le" };
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
    return { error: "Chien dich khong ton tai" };
  }

  if (existing.status !== "draft") {
    return { error: "Chi co the len lich chien dich nhap" };
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
    .select("id, status, target_segment")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return { error: "Chien dich khong ton tai" };
  }

  if (existing.status !== "scheduled") {
    return { error: "Chi co the gui chien dich da len lich" };
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

  revalidatePath(CAMPAIGNS_PATH);
  return { error: null, success: true, sent_count: sentCount };
}

export const sendCampaign = withServerAction(_sendCampaign);
