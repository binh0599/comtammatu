import { NextResponse } from "next/server";
import { createSupabaseServer } from "@comtammatu/database";

/**
 * GDPR Deletion Cron — Vercel Cron Job
 *
 * Runs daily at 3 AM UTC via vercel.json cron config.
 * Processes pending deletion requests where scheduled_deletion_at <= NOW().
 * Uses Supabase service role (via server client) to bypass RLS.
 */

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServer();

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

      // 6. Audit log (system-level cron action)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("audit_logs").insert({
        tenant_id: 0,
        user_id: "system-cron",
        action: "gdpr_scheduled_deletion",
        resource_type: "customer",
        resource_id: req.customer_id,
        new_value: JSON.stringify({ deletion_request_id: req.id }),
      });

      // 7. Security event for compliance tracking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("security_events").insert({
        tenant_id: 0,
        event_type: "gdpr_deletion_processed",
        severity: "info",
        description: `GDPR deletion processed for customer ${req.customer_id}`,
        source_ip: "cron",
      });

      processed++;
    } catch (err) {
      console.error(`[GDPR Cron] Error processing deletion request ${req.id}:`, err);
      errors.push({ id: req.id, error: String(err) });

      // Log failure as security event
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("security_events").insert({
        tenant_id: 0,
        event_type: "gdpr_deletion_failed",
        severity: "high",
        description: `GDPR deletion failed for request ${req.id}: ${String(err)}`,
        source_ip: "cron",
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
