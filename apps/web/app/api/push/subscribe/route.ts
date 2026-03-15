import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@comtammatu/database";
import { subscribePushSchema, unsubscribePushSchema } from "@comtammatu/shared";
import { apiLimiter } from "@comtammatu/security";

/**
 * POST /api/push/subscribe
 * Register a push subscription for the authenticated user.
 *
 * Note: push_subscriptions table types will be available after migration is applied
 * and `supabase gen types typescript` is re-run. Until then, we use type assertions.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success: rateLimitOk } = await apiLimiter.limit(`push-sub:${user.id}`);
  if (!rateLimitOk) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = subscribePushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid subscription data", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { endpoint, keys, notification_types } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- push_subscriptions table not in generated types (added via migration)
  const { error } = await (supabase as any).from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      notification_types,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push/subscribe] DB error:", (error as { message: string }).message);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/push/subscribe
 * Remove a push subscription.
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = unsubscribePushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- push_subscriptions table not in generated types (added via migration)
  await (supabase as any)
    .from("push_subscriptions")
    .update({ status: "unsubscribed", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);

  return NextResponse.json({ ok: true });
}
