import { createSupabaseServer } from "@comtammatu/database";
import { sendPushToSubscription, type PushPayload } from "./web-push";
import type { PushNotificationType } from "@comtammatu/shared";

interface PushSubscriptionRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  notification_types: string[] | null;
}

/**
 * Send push notifications to a specific user.
 * Automatically removes expired subscriptions.
 *
 * Note: push_subscriptions table types will be available after migration is applied
 * and `supabase gen types typescript` is re-run. Until then, we use type assertions.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  notificationType: PushNotificationType
): Promise<number> {
  const supabase = await createSupabaseServer();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscriptions } = (await (supabase as any)
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, notification_types")
    .eq("user_id", userId)
    .eq("status", "active")) as { data: PushSubscriptionRow[] | null };

  if (!subscriptions?.length) return 0;

  let sent = 0;
  const expiredIds: number[] = [];

  for (const sub of subscriptions) {
    // Check if user subscribed to this notification type
    if (sub.notification_types && !sub.notification_types.includes(notificationType)) continue;

    const success = await sendPushToSubscription(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );

    if (success) {
      sent++;
    } else {
      expiredIds.push(sub.id);
    }
  }

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("push_subscriptions")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .in("id", expiredIds);
  }

  return sent;
}

/**
 * Send push notifications to all users with a specific role in a branch.
 */
export async function sendPushToBranchRole(
  tenantId: number,
  branchId: number,
  roles: string[],
  payload: PushPayload,
  notificationType: PushNotificationType
): Promise<number> {
  const supabase = await createSupabaseServer();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("branch_id", branchId)
    .in("role", roles);

  if (!profiles?.length) return 0;

  let totalSent = 0;
  for (const profile of profiles) {
    totalSent += await sendPushToUser(profile.id, payload, notificationType);
  }
  return totalSent;
}

/**
 * Send push notifications to all users with a specific role across all branches.
 */
export async function sendPushToTenantRole(
  tenantId: number,
  roles: string[],
  payload: PushPayload,
  notificationType: PushNotificationType
): Promise<number> {
  const supabase = await createSupabaseServer();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("role", roles);

  if (!profiles?.length) return 0;

  let totalSent = 0;
  for (const profile of profiles) {
    totalSent += await sendPushToUser(profile.id, payload, notificationType);
  }
  return totalSent;
}
