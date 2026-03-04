"use server";

import "@/lib/server-bootstrap";
import {
    getActionContext,
    entityIdSchema,
    withServerAction,
    withServerQuery,
    safeDbError,
} from "@comtammatu/shared";

// ===== getNotifications =====

async function _getNotifications() {
    const ctx = await getActionContext();
    const { supabase, userId } = ctx;

    const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, data, is_read, created_at, channel")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) throw safeDbError(error, "db");
    return data ?? [];
}

export const getNotifications = withServerQuery(_getNotifications);

// ===== getUnreadCount =====

async function _getUnreadCount() {
    const ctx = await getActionContext();
    const { supabase, userId } = ctx;

    const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    if (error) throw safeDbError(error, "db");
    return count ?? 0;
}

export const getUnreadCount = withServerQuery(_getUnreadCount);

// ===== markNotificationRead =====

async function _markNotificationRead(notificationId: number) {
    entityIdSchema.parse(notificationId);
    const ctx = await getActionContext();
    const { supabase, userId } = ctx;

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", userId);

    if (error) throw safeDbError(error, "db");
    return { error: null };
}

export const markNotificationRead = withServerAction(_markNotificationRead);

// ===== markAllRead =====

async function _markAllRead() {
    const ctx = await getActionContext();
    const { supabase, userId } = ctx;

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    if (error) throw safeDbError(error, "db");
    return { error: null };
}

export const markAllRead = withServerAction(_markAllRead);
