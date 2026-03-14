import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToTenantRole } from "@/lib/push-sender";

/**
 * Inventory Alerts Cron — Vercel Cron Job
 *
 * Runs daily at 5 AM UTC via vercel.json cron config.
 * For each tenant's active branches:
 *   - Checks stock_levels where quantity <= min_stock → low stock alerts
 *   - Checks stock_batches where expiry_date within 3 days → expiry alerts
 * Inserts alerts into security_events with deduplication (same alert not created twice per day).
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

  // Get all active branches with their tenant info
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, name, tenant_id")
    .eq("is_active", true);

  if (branchError) {
    console.error("[Inventory Alerts Cron] Failed to fetch branches:", branchError.message);
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
  }

  if (!branches || branches.length === 0) {
    return NextResponse.json({ message: "No active branches", alerts_created: 0 });
  }

  // Get today's start (UTC) for deduplication
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayISO = todayStart.toISOString();

  // Fetch existing alerts created today for deduplication
  const { data: existingAlerts } = await supabase
    .from("security_events")
    .select("event_type, details")
    .in("event_type", ["inventory_low_stock", "inventory_expiring"])
    .gte("created_at", todayISO);

  // Build a set of dedup keys from existing alerts
  const existingKeys = new Set<string>();
  if (existingAlerts) {
    for (const alert of existingAlerts) {
      const details = alert.details as Record<string, unknown> | null;
      if (details) {
        const key = `${alert.event_type}:${String(details.tenant_id ?? "")}:${String(details.ingredient_id ?? "")}:${String(details.branch_id ?? "")}`;
        existingKeys.add(key);
      }
    }
  }

  let alertsCreated = 0;
  const alertsPerTenant = new Map<number, number>();
  const errors: Array<{ branch_id: number; error: string }> = [];

  // Expiry threshold: 3 days from now
  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() + 3);
  const expiryThresholdDate = expiryThreshold.toISOString().split("T")[0]!;

  // 1 day from now for critical severity
  const criticalThreshold = new Date();
  criticalThreshold.setDate(criticalThreshold.getDate() + 1);
  const criticalThresholdDate = criticalThreshold.toISOString().split("T")[0]!;

  for (const branch of branches) {
    try {
      // === Low Stock Alerts ===
      const { data: lowStockItems, error: lowStockError } = await supabase
        .from("stock_levels")
        .select("ingredient_id, quantity, ingredients!inner(name, unit, min_stock, tenant_id)")
        .eq("branch_id", branch.id)
        .eq("ingredients.tenant_id", branch.tenant_id)
        .not("ingredients.min_stock", "is", null);

      if (lowStockError) {
        errors.push({ branch_id: branch.id, error: lowStockError.message });
      } else if (lowStockItems) {
        for (const item of lowStockItems) {
          const ingredient = item.ingredients as unknown as {
            name: string;
            unit: string;
            min_stock: number | null;
            tenant_id: number;
          };

          if (ingredient.min_stock === null) continue;
          if (item.quantity > ingredient.min_stock) continue;

          const dedupKey = `inventory_low_stock:${branch.tenant_id}:${item.ingredient_id}:${branch.id}`;
          if (existingKeys.has(dedupKey)) continue;

          const { error: insertError } = await supabase.from("security_events").insert({
            tenant_id: branch.tenant_id,
            event_type: "inventory_low_stock",
            severity: "warning",
            source_ip: null,
            details: {
              branch_id: branch.id,
              branch_name: branch.name,
              ingredient_id: item.ingredient_id,
              ingredient_name: ingredient.name,
              current_quantity: item.quantity,
              min_quantity: ingredient.min_stock,
              unit: ingredient.unit,
            },
          });

          if (insertError) {
            errors.push({ branch_id: branch.id, error: insertError.message });
          } else {
            existingKeys.add(dedupKey);
            alertsCreated++;
            alertsPerTenant.set(branch.tenant_id, (alertsPerTenant.get(branch.tenant_id) ?? 0) + 1);
          }
        }
      }

      // === Expiry Alerts ===
      const { data: expiringBatches, error: expiryError } = await supabase
        .from("stock_batches")
        .select("id, ingredient_id, quantity, expiry_date, ingredients(name, unit)")
        .eq("branch_id", branch.id)
        .gt("quantity", 0)
        .not("expiry_date", "is", null)
        .lte("expiry_date", expiryThresholdDate);

      if (expiryError) {
        errors.push({ branch_id: branch.id, error: expiryError.message });
      } else if (expiringBatches) {
        for (const batch of expiringBatches) {
          const dedupKey = `inventory_expiring:${branch.tenant_id}:${batch.ingredient_id}:${branch.id}`;
          if (existingKeys.has(dedupKey)) continue;

          const ingredient = batch.ingredients as unknown as {
            name: string;
            unit: string;
          } | null;

          // Critical if expiring within 1 day, warning otherwise
          const severity =
            batch.expiry_date && batch.expiry_date <= criticalThresholdDate
              ? "critical"
              : "warning";

          const { error: insertError } = await supabase.from("security_events").insert({
            tenant_id: branch.tenant_id,
            event_type: "inventory_expiring",
            severity,
            source_ip: null,
            details: {
              branch_id: branch.id,
              branch_name: branch.name,
              ingredient_id: batch.ingredient_id,
              ingredient_name: ingredient?.name ?? `#${batch.ingredient_id}`,
              batch_id: batch.id,
              expiry_date: batch.expiry_date,
              quantity: batch.quantity,
            },
          });

          if (insertError) {
            errors.push({ branch_id: branch.id, error: insertError.message });
          } else {
            existingKeys.add(dedupKey);
            alertsCreated++;
            alertsPerTenant.set(branch.tenant_id, (alertsPerTenant.get(branch.tenant_id) ?? 0) + 1);
          }
        }
      }
    } catch (err) {
      console.error(`[Inventory Alerts Cron] Error processing branch ${branch.id}:`, err);
      errors.push({ branch_id: branch.id, error: String(err) });
    }
  }

  // Send push notifications to inventory managers if new alerts were created
  if (alertsCreated > 0) {
    for (const [tenantId, count] of alertsPerTenant) {
      void sendPushToTenantRole(
        tenantId,
        ["owner", "manager", "inventory"],
        {
          title: "Cảnh báo kho hàng",
          body: `Có ${count} cảnh báo mới về tồn kho/hết hạn`,
          url: "/admin/notifications",
          type: "low_stock",
        },
        "low_stock"
      );
    }
  }

  console.log(
    `[Inventory Alerts Cron] Created ${alertsCreated} alerts across ${branches.length} branches`
  );

  return NextResponse.json({
    message: `Created ${alertsCreated} alerts across ${branches.length} branches`,
    alerts_created: alertsCreated,
    branches_checked: branches.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
