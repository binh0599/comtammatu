// comtammatu/security — Rate limiting, account lockout, webhook verification

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

let _upstashConfigured: boolean | null = null;
let _redis: Redis | null = null;

function isUpstashConfigured(): boolean {
  if (_upstashConfigured === null) {
    _upstashConfigured = !!(
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    );
  }
  return _upstashConfigured;
}

function getRedis(): Redis | null {
  if (!isUpstashConfigured()) return null;
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
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
    redis: getRedis()!,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: config.prefix ?? "@comtammatu/ratelimit",
    analytics: false,
  });
}

// =====================
// Pre-configured limiters
// =====================

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
 * Payment rate limiter: 10 requests per 60 seconds per user.
 * Prevents rapid-fire payment attempts.
 */
export const paymentLimiter = createRateLimiter({
  requests: 10,
  window: "60 s",
  prefix: "ratelimit:payment",
});

/**
 * Order creation rate limiter: 20 requests per 60 seconds per user.
 * Prevents accidental duplicate orders.
 */
export const orderLimiter = createRateLimiter({
  requests: 20,
  window: "60 s",
  prefix: "ratelimit:order",
});

/**
 * Campaign send rate limiter: 3 requests per 300 seconds per user.
 * Prevents accidental mass campaign sends.
 */
export const campaignLimiter = createRateLimiter({
  requests: 3,
  window: "300 s",
  prefix: "ratelimit:campaign",
});

// =====================
// Account lockout
// =====================

const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 900; // 15 phút
const LOCKOUT_KEY_PREFIX = "lockout:";

export type LockoutResult = {
  locked: boolean;
  attemptsRemaining: number;
  lockoutUntil: number | null; // Unix ms
};

/**
 * Check if an account is currently locked out.
 */
export async function checkAccountLockout(
  identifier: string,
): Promise<LockoutResult> {
  const redis = getRedis();
  if (!redis) {
    return { locked: false, attemptsRemaining: LOCKOUT_MAX_ATTEMPTS, lockoutUntil: null };
  }

  const key = `${LOCKOUT_KEY_PREFIX}${identifier}`;
  const attempts = await redis.get<number>(key);

  if (attempts !== null && attempts >= LOCKOUT_MAX_ATTEMPTS) {
    const ttl = await redis.ttl(key);
    return {
      locked: true,
      attemptsRemaining: 0,
      lockoutUntil: ttl > 0 ? Date.now() + ttl * 1000 : null,
    };
  }

  return {
    locked: false,
    attemptsRemaining: LOCKOUT_MAX_ATTEMPTS - (attempts ?? 0),
    lockoutUntil: null,
  };
}

/**
 * Record a failed login attempt. Returns updated lockout status.
 */
export async function recordFailedLogin(
  identifier: string,
): Promise<LockoutResult> {
  const redis = getRedis();
  if (!redis) {
    return { locked: false, attemptsRemaining: LOCKOUT_MAX_ATTEMPTS, lockoutUntil: null };
  }

  const key = `${LOCKOUT_KEY_PREFIX}${identifier}`;
  const attempts = await redis.incr(key);

  // Set expiry on first attempt
  if (attempts === 1) {
    await redis.expire(key, LOCKOUT_WINDOW_SECONDS);
  }

  if (attempts >= LOCKOUT_MAX_ATTEMPTS) {
    // Reset TTL on lockout to extend the window
    await redis.expire(key, LOCKOUT_WINDOW_SECONDS);
    return {
      locked: true,
      attemptsRemaining: 0,
      lockoutUntil: Date.now() + LOCKOUT_WINDOW_SECONDS * 1000,
    };
  }

  return {
    locked: false,
    attemptsRemaining: LOCKOUT_MAX_ATTEMPTS - attempts,
    lockoutUntil: null,
  };
}

/**
 * Clear failed login attempts after successful login.
 */
export async function clearFailedLogins(identifier: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = `${LOCKOUT_KEY_PREFIX}${identifier}`;
  await redis.del(key);
}

// =====================
// Helpers
// =====================

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
