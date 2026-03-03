"use client";

import { useRealtimeBroadcast } from "@/hooks/use-realtime-broadcast";

/**
 * Invisible component that subscribes to Supabase Realtime Broadcast
 * for the given branch. Renders nothing — just triggers toast notifications
 * via the useRealtimeBroadcast hook.
 */
export function RealtimeNotifications({ branchId }: { branchId: number }) {
    useRealtimeBroadcast(branchId);
    return null;
}
