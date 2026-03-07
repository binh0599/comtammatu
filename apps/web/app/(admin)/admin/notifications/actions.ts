"use server";

import "@/lib/server-bootstrap";
import {
  getAdminContext,
  INVENTORY_ROLES,
  withServerQuery,
} from "@comtammatu/shared";

// =====================
// Notification Queries
// =====================

async function _getNotifications(limit: number = 50) {
  const { supabase, tenantId } = await getAdminContext(INVENTORY_ROLES);

  const { data, error } = await supabase
    .from("security_events")
    .select("*")
    .eq("tenant_id", tenantId)
    .like("event_type", "inventory_%")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getNotifications = withServerQuery(_getNotifications);

async function _getUnreadNotificationCount() {
  const { supabase, tenantId } = await getAdminContext(INVENTORY_ROLES);

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error: countError } = await supabase
    .from("security_events")
    .select("id")
    .eq("tenant_id", tenantId)
    .like("event_type", "inventory_%")
    .gte("created_at", twentyFourHoursAgo);

  if (countError) throw new Error(countError.message);
  return events?.length ?? 0;
}

export const getUnreadNotificationCount = withServerQuery(_getUnreadNotificationCount);
