// comtammatu/security — Rate limiting, webhook verification, encryption helpers

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * No-op limiter used when Upstash env vars are not configured (dev mode).
 * Always allows requests through.
 */
const noopLimiter = {
  async limit(_identifier: string): Promise<RateLimitResult> {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  },
};

type LimiterLike = {
  limit(identifier: string): Promise<RateLimitResult>;
};

function isUpstashConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function createRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

/**
 * Create a rate limiter with sliding window algorithm.
 * Falls back to no-op if Upstash is not configured.
 */
export function createRateLimiter(config: {
  requests: number;
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`;
  prefix?: string;
}): LimiterLike {
  if (!isUpstashConfigured()) {
    return noopLimiter;
  }

  return new Ratelimit({
    redis: createRedis(),
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: config.prefix ?? "@comtammatu/ratelimit",
    analytics: false,
  });
}

/**
 * Auth rate limiter: 5 requests per 60 seconds per identifier.
 * Used for login, password reset, etc.
 */
export const authLimiter = createRateLimiter({
  requests: 5,
  window: "60 s",
  prefix: "ratelimit:auth",
});

/**
 * API rate limiter: 30 requests per 60 seconds per identifier.
 * Used for authenticated API endpoints.
 */
export const apiLimiter = createRateLimiter({
  requests: 30,
  window: "60 s",
  prefix: "ratelimit:api",
});

/**
 * Webhook rate limiter: 10 requests per 60 seconds per identifier.
 * Used for external webhook endpoints (Momo, VNPay, etc.).
 */
export const webhookLimiter = createRateLimiter({
  requests: 10,
  window: "60 s",
  prefix: "ratelimit:webhook",
});

/**
 * Extract client IP from request headers.
 * Falls back to "unknown" if no IP can be determined.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
