import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Payment Expiry Cron — Vercel Cron Job
 *
 * Runs every 10 minutes via vercel.json cron config.
 * Marks pending payments older than 30 minutes as 'expired'.
 * Uses Supabase service role to bypass RLS (no user session in cron context).
 */

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Find pending payments older than 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: stalePayments, error: fetchError } = await supabase
    .from("payments")
    .select("id, order_id, method, provider")
    .eq("status", "pending")
    .lt("created_at", thirtyMinutesAgo);

  if (fetchError) {
    console.error("[Expire Payments] Failed to fetch:", fetchError.message);
    return NextResponse.json({ error: "Failed to fetch stale payments" }, { status: 500 });
  }

  if (!stalePayments || stalePayments.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  const staleIds = stalePayments.map((p) => p.id);

  const { error: updateError, count } = await supabase
    .from("payments")
    .update({ status: "expired" })
    .in("id", staleIds)
    .eq("status", "pending"); // Double-check still pending (race condition guard)

  if (updateError) {
    console.error("[Expire Payments] Failed to expire:", updateError.message);
    return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
  }

  console.log(`[Expire Payments] Expired ${count ?? staleIds.length} stale pending payments`);

  return NextResponse.json({ expired: count ?? staleIds.length });
}
