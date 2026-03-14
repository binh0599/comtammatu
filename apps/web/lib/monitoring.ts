/**
 * Simple monitoring utilities for server-side performance tracking.
 */

/**
 * Wraps an async operation with timing measurement.
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration_ms: number }> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration_ms = Math.round((performance.now() - start) * 100) / 100;
    return { result, duration_ms };
  } catch (error) {
    const duration_ms = Math.round((performance.now() - start) * 100) / 100;
    logPerformance(name, duration_ms, {
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}

/**
 * Structured JSON logging for server actions and operations.
 * Uses console.log with structured data in all environments.
 */
export function logPerformance(
  action: string,
  duration_ms: number,
  metadata?: Record<string, unknown>
): void {
  const entry = {
    type: "performance" as const,
    action,
    duration_ms,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  if (process.env.NODE_ENV === "production") {
    // Single-line JSON for log aggregators (Vercel, Datadog, etc.)
    console.log(JSON.stringify(entry));
  } else {
    console.log(`[perf] ${action}: ${duration_ms}ms`, metadata ?? "");
  }
}
