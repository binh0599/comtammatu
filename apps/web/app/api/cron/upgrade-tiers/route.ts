import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@comtammatu/shared";

const log = createLogger("cron:upgrade-tiers");

/**
 * Auto-Tier Upgrade Cron — Vercel Cron Job
 *
 * Runs daily at 4 AM UTC via vercel.json cron config.
 * For each tenant, finds the highest loyalty tier each customer qualifies for
 * based on their current points balance, and upgrades them if needed.
 */

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Get all tenants with loyalty tiers
  const { data: tiers, error: tiersError } = await supabase
    .from("loyalty_tiers")
    .select("id, tenant_id, min_points")
    .order("min_points", { ascending: false });

  if (tiersError) {
    log.error("Lỗi truy vấn hạng thành viên", { action: "fetch-tiers" });
    return NextResponse.json({ error: "Failed to fetch tiers" }, { status: 500 });
  }

  if (!tiers || tiers.length === 0) {
    return NextResponse.json({ message: "No loyalty tiers configured", upgraded: 0 });
  }

  // Group tiers by tenant (already sorted desc by min_points)
  const tiersByTenant = new Map<number, Array<{ id: number; min_points: number }>>();
  for (const tier of tiers) {
    const existing = tiersByTenant.get(tier.tenant_id);
    if (existing) {
      existing.push(tier);
    } else {
      tiersByTenant.set(tier.tenant_id, [tier]);
    }
  }

  let upgraded = 0;
  let checked = 0;
  const errors: Array<{ customer_id: number; error: string }> = [];

  for (const [tenantId, tenantTiers] of tiersByTenant) {
    // Get all active customers for this tenant with their current points balance
    const { data: customers, error: custError } = await supabase
      .from("customers")
      .select("id, loyalty_tier_id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (custError) {
      log.error("Lỗi truy vấn khách hàng", { action: "fetch-customers", tenantId });
      continue;
    }

    if (!customers || customers.length === 0) continue;

    // Bulk-fetch latest balance for all customers in this tenant
    const customerIds = customers.map((c) => c.id);
    const { data: balanceRows } = await supabase
      .rpc("get_latest_loyalty_balances", { customer_ids: customerIds });

    // Build a map of customer_id → balance_after
    const balanceMap = new Map<number, number>();
    if (balanceRows) {
      for (const row of balanceRows as Array<{ customer_id: number; balance_after: number }>) {
        balanceMap.set(row.customer_id, row.balance_after);
      }
    }

    for (const customer of customers) {
      checked++;

      const balance = balanceMap.get(customer.id) ?? 0;

      // Find best tier (tenantTiers is sorted desc by min_points)
      const bestTier = tenantTiers.find((t) => t.min_points <= balance);
      const bestTierId = bestTier?.id ?? null;

      if (bestTierId !== customer.loyalty_tier_id) {
        const { error: updateError } = await supabase
          .from("customers")
          .update({ loyalty_tier_id: bestTierId })
          .eq("id", customer.id);

        if (updateError) {
          errors.push({ customer_id: customer.id, error: updateError.message });
        } else {
          upgraded++;
        }
      }
    }
  }

  log.info(`Đã kiểm tra ${checked} khách hàng, nâng hạng ${upgraded}`);

  return NextResponse.json({
    message: `Checked ${checked} customers, upgraded ${upgraded}`,
    checked,
    upgraded,
    errors: errors.length > 0 ? errors : undefined,
  });
}
