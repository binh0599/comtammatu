import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * GDPR Deletion Automation — Supabase Edge Function
 *
 * Processes pending deletion requests where scheduled_deletion_at <= NOW().
 * For each request:
 *   1. Anonymizes customer PII
 *   2. Nulls customer_id on orders (keeps orders for accounting)
 *   3. Deletes loyalty transactions and feedback
 *   4. Marks deletion request as completed
 *   5. Logs to audit_logs
 *
 * Trigger: Supabase cron job or manual invocation via service role key.
 */

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Find pending deletion requests past their scheduled date
  const { data: requests, error: fetchError } = await supabase
    .from("deletion_requests")
    .select("id, customer_id")
    .eq("status", "pending")
    .lte("scheduled_deletion_at", new Date().toISOString());

  if (fetchError) {
    console.error("Failed to fetch deletion requests:", fetchError);
    return new Response(JSON.stringify({ error: "Failed to fetch requests" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!requests || requests.length === 0) {
    return new Response(JSON.stringify({ message: "No pending deletion requests", processed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  const errors: Array<{ id: number; error: string }> = [];

  for (const request of requests) {
    try {
      // 1. Anonymize customer PII
      const { error: anonError } = await supabase
        .from("customers")
        .update({
          full_name: "[Da xoa]",
          phone: "[Da xoa]",
          email: null,
          is_active: false,
          notes: null,
          birthday: null,
          gender: null,
        })
        .eq("id", request.customer_id);

      if (anonError) {
        errors.push({ id: request.id, error: anonError.message });
        continue;
      }

      // 2. Null out customer_id on orders
      await supabase
        .from("orders")
        .update({ customer_id: null })
        .eq("customer_id", request.customer_id);

      // 3. Delete loyalty transactions
      await supabase.from("loyalty_transactions").delete().eq("customer_id", request.customer_id);

      // 4. Delete customer feedback
      await supabase.from("customer_feedback").delete().eq("customer_id", request.customer_id);

      // 5. Mark deletion request as completed
      const { error: updateError } = await supabase
        .from("deletion_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          processed_by: null,
        })
        .eq("id", request.id);

      if (updateError) {
        errors.push({ id: request.id, error: updateError.message });
        continue;
      }

      // 6. Audit log
      await supabase.from("audit_logs").insert({
        tenant_id: null,
        user_id: null,
        action: "gdpr_scheduled_deletion",
        resource_type: "customer",
        resource_id: String(request.customer_id),
        changes: JSON.stringify({ deletion_request_id: request.id }),
      });

      processed++;
    } catch (err) {
      console.error(`Error processing deletion request ${request.id}:`, err);
      errors.push({ id: request.id, error: String(err) });
    }
  }

  return new Response(
    JSON.stringify({
      message: `Processed ${processed} deletion requests`,
      processed,
      total: requests.length,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
