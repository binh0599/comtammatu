/**
 * Integration Test Helpers
 *
 * Provides authenticated Supabase clients for each test role,
 * seed data helpers, and cleanup utilities.
 *
 * Uses the REAL Supabase project (zrlriuednoaqrsvnjjyo) with test accounts.
 * Test accounts: {role}@comtammatu.vn / Test1234!
 *
 * Run: pnpm vitest tests/integration/
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://zrlriuednoaqrsvnjjyo.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is required for integration tests. " +
      "Set it in .env.local or environment.",
  );
}

// ---------------------------------------------------------------------------
// Test Accounts
// ---------------------------------------------------------------------------

export const TEST_PASSWORD = "Test1234!";

export const TEST_ACCOUNTS = {
  owner: "owner@comtammatu.vn",
  manager: "manager@comtammatu.vn",
  cashier: "cashier@comtammatu.vn",
  chef: "chef@comtammatu.vn",
  waiter: "waiter@comtammatu.vn",
  customer: "customer@comtammatu.vn",
} as const;

export type TestRole = keyof typeof TEST_ACCOUNTS;

// ---------------------------------------------------------------------------
// Known Seed Data IDs (from seeding script)
// ---------------------------------------------------------------------------

export const SEED = {
  tenantId: 3,
  branchQ1: 3,
  branchQ3: 4,
  menuId: 1,
} as const;

// ---------------------------------------------------------------------------
// Client Factories
// ---------------------------------------------------------------------------

/** Create an anonymous (unauthenticated) Supabase client */
export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** Create a service-role Supabase client (bypasses RLS) */
export function createServiceClient(): SupabaseClient {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for service client");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/** Sign in as a specific role and return the authenticated client */
export async function createAuthClient(
  role: TestRole,
): Promise<SupabaseClient> {
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({
    email: TEST_ACCOUNTS[role],
    password: TEST_PASSWORD,
  });
  if (error) {
    throw new Error(`Failed to sign in as ${role}: ${error.message}`);
  }
  return client;
}

// ---------------------------------------------------------------------------
// Cleanup Helpers
// ---------------------------------------------------------------------------

/**
 * Delete rows created during test by IDs.
 * Uses service client to bypass RLS.
 */
export async function cleanupRows(
  table: string,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;
  const service = createServiceClient();
  await service.from(table).delete().in("id", ids);
}

/**
 * Wait for a condition to become true (polling).
 * Useful for waiting on realtime or async database triggers.
 */
export async function waitFor(
  fn: () => Promise<boolean>,
  {
    timeout = 10_000,
    interval = 500,
    label = "condition",
  }: { timeout?: number; interval?: number; label?: string } = {},
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitFor("${label}") timed out after ${timeout}ms`);
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/** Assert that a Supabase query returned data without error */
export function assertSuccess<T>(result: {
  data: T | null;
  error: { message: string } | null;
}): asserts result is { data: T; error: null } {
  if (result.error) {
    throw new Error(`Supabase query failed: ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error("Supabase query returned null data (RLS may have blocked)");
  }
}

/** Assert that a Supabase query was blocked (RLS or auth) */
export function assertBlocked(result: {
  data: unknown;
  error: { message: string; code?: string } | null;
}): void {
  // RLS can manifest as error OR as empty data (silent block)
  const isError = result.error !== null;
  const isEmpty =
    result.data === null ||
    (Array.isArray(result.data) && result.data.length === 0);
  if (!isError && !isEmpty) {
    throw new Error(
      `Expected query to be blocked by RLS, but got data: ${JSON.stringify(result.data).slice(0, 200)}`,
    );
  }
}
