import { safeDbError } from "@comtammatu/shared";

/**
 * Get today's YYYY-MM-DD in the given IANA timezone.
 * Falls back to UTC if timezone is invalid.
 */
export function todayInTimezone(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")!.value;
    const m = parts.find((p) => p.type === "month")!.value;
    const d = parts.find((p) => p.type === "day")!.value;
    return `${y}-${m}-${d}`;
  } catch {
    // Invalid timezone — fall back to UTC
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

/**
 * Get current HH:MM:SS in the given IANA timezone.
 */
export function nowTimeInTimezone(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: tz });
  } catch {
    return new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" });
  }
}

/**
 * Shared helper: look up the current user's employee record + branch timezone.
 * Throws on DB/RLS error, returns null if no employee record exists.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findMyEmployee(supabase: any, userId: string, tenantId: number) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, branches!inner(timezone)")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw safeDbError(error, "db");
  if (!data) return null;
  return {
    id: data.id as number,
    timezone: (data.branches?.timezone as string) ?? "UTC",
  };
}
