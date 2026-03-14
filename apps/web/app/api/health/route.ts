import { NextResponse } from "next/server";
import { prisma } from "@comtammatu/database";
import { createClient } from "@comtammatu/database/src/supabase/server";
import { measureAsync } from "@/lib/monitoring";

const startTime = Date.now();

/**
 * GET /api/health
 * Public health check endpoint — không yêu cầu xác thực.
 * Kiểm tra kết nối Database (Prisma) + Supabase service.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const uptimeS = Math.floor((Date.now() - startTime) / 1000);

  // Chạy health checks song song
  const [dbCheck, supabaseCheck] = await Promise.allSettled([checkDatabase(), checkSupabase()]);

  const dbResult =
    dbCheck.status === "fulfilled"
      ? dbCheck.value
      : { status: "unhealthy" as const, latency_ms: -1 };

  const supabaseResult =
    supabaseCheck.status === "fulfilled"
      ? supabaseCheck.value
      : { status: "unhealthy" as const, latency_ms: -1 };

  // Xác định trạng thái tổng thể
  const allHealthy = dbResult.status === "healthy" && supabaseResult.status === "healthy";
  const allUnhealthy = dbResult.status === "unhealthy" && supabaseResult.status === "unhealthy";

  const overallStatus = allHealthy ? "healthy" : allUnhealthy ? "unhealthy" : "degraded";

  const statusCode = overallStatus === "unhealthy" ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp,
      uptime_s: uptimeS,
      checks: {
        database: dbResult,
        supabase: supabaseResult,
      },
      version: process.env.npm_package_version || "unknown",
    },
    {
      status: statusCode,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

async function checkDatabase(): Promise<{
  status: "healthy" | "unhealthy";
  latency_ms: number;
}> {
  try {
    const DB_TIMEOUT_MS = 2000;
    const { duration_ms } = await measureAsync("health:db", async () => {
      await Promise.race([
        prisma.$queryRawUnsafe("SELECT 1"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DB probe timeout")), DB_TIMEOUT_MS)
        ),
      ]);
    });
    return { status: "healthy", latency_ms: duration_ms };
  } catch {
    return { status: "unhealthy", latency_ms: -1 };
  }
}

async function checkSupabase(): Promise<{
  status: "healthy" | "unhealthy";
  latency_ms: number;
}> {
  try {
    const start = Date.now();
    const supabase = await createClient();
    // Kiểm tra kết nối Supabase bằng query đơn giản
    await Promise.race([
      supabase.from("tenants").select("id").limit(1),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase probe timeout")), 3000)
      ),
    ]);
    const latency = Date.now() - start;
    return { status: "healthy", latency_ms: latency };
  } catch {
    return { status: "unhealthy", latency_ms: -1 };
  }
}
