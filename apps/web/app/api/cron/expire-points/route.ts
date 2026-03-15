import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@comtammatu/shared";

const log = createLogger("cron:expire-points");

/**
 * Point Expiry Cron — Vercel Cron Job
 *
 * Runs daily at 2 AM via vercel.json cron config.
 * Marks earn transactions older than 365 days as expired,
 * and inserts compensating "expire" transactions to reduce balance.
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

  // Find earn transactions that have expired (expires_at <= now) and not yet marked
  const { data: expiredTxns, error: fetchError } = await supabase
    .from("loyalty_transactions")
    .select("id, customer_id, points, balance_after")
    .eq("type", "earn")
    .eq("is_expired", false)
    .not("expires_at", "is", null)
    .lte("expires_at", new Date().toISOString())
    .limit(500); // Process in batches to avoid timeout

  if (fetchError) {
    log.error("Lỗi truy vấn giao dịch hết hạn", { action: "fetch" });
    return NextResponse.json(
      { error: "Lỗi truy vấn giao dịch hết hạn" },
      { status: 500 },
    );
  }

  if (!expiredTxns || expiredTxns.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  let expiredCount = 0;

  for (const txn of expiredTxns) {
    // Mark the original earn transaction as expired
    const { error: markError } = await supabase
      .from("loyalty_transactions")
      .update({ is_expired: true })
      .eq("id", txn.id);

    if (markError) {
      log.error(`Lỗi đánh dấu giao dịch #${txn.id}`, { action: "mark-expired" });
      continue;
    }

    // Get customer's current balance (latest transaction)
    const { data: latest } = await supabase
      .from("loyalty_transactions")
      .select("balance_after")
      .eq("customer_id", txn.customer_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const currentBalance = latest?.balance_after ?? 0;
    // Only expire up to the points that were earned (don't go below 0)
    const pointsToExpire = Math.min(txn.points, currentBalance);

    if (pointsToExpire > 0) {
      const newBalance = currentBalance - pointsToExpire;

      // Insert compensating "expire" transaction
      const { error: insertError } = await supabase.from("loyalty_transactions").insert({
        customer_id: txn.customer_id,
        points: -pointsToExpire,
        type: "expire",
        balance_after: newBalance,
        reference_type: "loyalty_transaction",
        reference_id: txn.id,
      });

      if (insertError) {
        log.error(`Lỗi tạo giao dịch hết hạn cho khách hàng #${txn.customer_id}`, { action: "insert-expire" });
        continue;
      }
    }

    expiredCount++;
  }

  log.info(`Đã xử lý ${expiredCount}/${expiredTxns.length} giao dịch hết hạn`);

  return NextResponse.json({ expired: expiredCount });
}
