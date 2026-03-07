import { NextResponse } from "next/server";
import { prisma } from "@comtammatu/database";
import { measureAsync } from "@/lib/monitoring";

/**
 * GET /api/health
 * Public health check endpoint — no auth required.
 * Returns database connectivity status and latency.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  let dbStatus: "healthy" | "unhealthy";
  let dbLatency = -1;

  try {
    const DB_TIMEOUT_MS = 2000;
    const { duration_ms } = await measureAsync("health:db", async () => {
      await Promise.race([
        prisma.$queryRawUnsafe("SELECT 1"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DB probe timeout")), DB_TIMEOUT_MS),
        ),
      ]);
    });
    dbStatus = "healthy";
    dbLatency = duration_ms;
  } catch {
    dbStatus = "unhealthy";
  }

  const statusCode = dbStatus === "healthy" ? 200 : 503;

  return NextResponse.json(
    {
      status: dbStatus,
      timestamp,
      checks: {
        database: {
          status: dbStatus,
          latency_ms: dbLatency,
        },
      },
      version: process.env.npm_package_version || "unknown",
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
