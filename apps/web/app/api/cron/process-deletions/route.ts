import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GDPR Deletion Cron — Vercel Cron Job
 *
 * Runs daily at 3 AM UTC via vercel.json cron config.
 * Processes pending deletion requests where scheduled_deletion_at <= NOW().
 * Uses Supabase service role to bypass RLS (no user session in cron context).
 */

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Find pending deletion requests past their scheduled date
  const { data: requests, error: fetchError } = await supabase
    .from("deletion_requests")
    .select("id, customer_id")
    .eq("status", "pending")
    .lte("scheduled_deletion_at", new Date().toISOString());

  if (fetchError) {
    console.error("[GDPR Cron] Failed to fetch deletion requests:", fetchError.message);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }

  if (!requests || requests.length === 0) {
    return NextResponse.json({ message: "No pending deletion requests", processed: 0 });
  }

  let processed = 0;
  const errors: Array<{ id: number; error: string }> = [];

  for (const req of requests) {
    try {
      // 1. Anonymize customer PII
      const { error: anonError } = await supabase
        .from("customers")
        .update({
          full_name: "[Đã xóa]",
          phone: "[Đã xóa]",
          email: null,
          is_active: false,
          notes: null,
          birthday: null,
          gender: null,
        })
        .eq("id", req.customer_id);

      if (anonError) {
        errors.push({ id: req.id, error: anonError.message });
        continue;
      }

      // 2. Null out customer_id on orders (keep orders for accounting)
      await supabase
        .from("orders")
        .update({ customer_id: null })
        .eq("customer_id", req.customer_id);

      // 3. Delete loyalty transactions
      await supabase
        .from("loyalty_transactions")
        .delete()
        .eq("customer_id", req.customer_id);

      // 4. Delete customer feedback
      await supabase
        .from("customer_feedback")
        .delete()
        .eq("customer_id", req.customer_id);

      // 5. Mark deletion request as completed
      const { error: updateError } = await supabase
        .from("deletion_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      if (updateError) {
        errors.push({ id: req.id, error: updateError.message });
        continue;
      }

      // 6. Security event for compliance tracking (fire-and-forget)
      await supabase.from("security_events").insert({
        tenant_id: null,
        event_type: "gdpr_deletion_processed",
        severity: "info",
        details: JSON.stringify({
          deletion_request_id: req.id,
          customer_id: req.customer_id,
        }),
        source_ip: null,
      });

      processed++;
    } catch (err) {
      console.error(`[GDPR Cron] Error processing deletion request ${req.id}:`, err);
      errors.push({ id: req.id, error: String(err) });

      // Log failure as security event
      await supabase.from("security_events").insert({
        tenant_id: null,
        event_type: "gdpr_deletion_failed",
        severity: "critical",
        details: JSON.stringify({
          deletion_request_id: req.id,
          error: String(err),
        }),
        source_ip: null,
      });
    }
  }

  console.log(`[GDPR Cron] Processed ${processed}/${requests.length} deletion requests`);

  return NextResponse.json({
    message: `Processed ${processed} deletion requests`,
    processed,
    total: requests.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
