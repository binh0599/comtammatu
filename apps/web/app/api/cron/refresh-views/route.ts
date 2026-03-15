import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@comtammatu/shared";

const log = createLogger("cron:refresh-views");

/**
 * Materialized View Refresh Cron — Vercel Cron Job
 *
 * Runs daily at 2 AM UTC via vercel.json cron config.
 * Refreshes all CQRS materialized views used by reports & analytics.
 * Uses CONCURRENTLY to avoid locking reads during refresh.
 */

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const startTime = Date.now();

  try {
    const { error } = await supabase.rpc("refresh_materialized_views");

    if (error) {
      log.error("Lỗi làm mới materialized views", { action: "refresh" });
      return NextResponse.json(
        { error: "Lỗi khi làm mới materialized views", details: error.message },
        { status: 500 }
      );
    }

    const durationMs = Date.now() - startTime;

    log.info("Hoàn tất làm mới materialized views", { duration_ms: durationMs });

    return NextResponse.json({
      message: "Đã làm mới tất cả materialized views",
      views: [
        "mv_daily_revenue",
        "mv_daily_payment_methods",
        "mv_daily_order_type_mix",
        "mv_item_popularity",
        "mv_staff_performance",
        "mv_inventory_usage",
        "mv_peak_hours",
      ],
      duration_ms: durationMs,
    });
  } catch (err) {
    log.error("Lỗi không mong muốn khi làm mới views", { action: "refresh", error: err });
    return NextResponse.json(
      { error: "Lỗi không mong muốn khi làm mới views" },
      { status: 500 },
    );
  }
}
