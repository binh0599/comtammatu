"use server";

import { createSupabaseServer } from "@comtammatu/database";

// --- Helper: Get tenant_id from authenticated user ---

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.tenant_id;
  if (!tenantId) throw new Error("No tenant assigned");

  return { supabase, tenantId };
}

// --- Security Events ---

export async function getSecurityEvents(severity?: string) {
  const { supabase, tenantId } = await getTenantId();

  let query = supabase
    .from("security_events")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (severity) {
    query = query.eq("severity", severity);
  }

  const { data: events, error } = await query;
  if (error) throw new Error(error.message);

  if (!events || events.length === 0) return [];

  // Collect unique user_ids and terminal_ids for batch lookup
  const userIds = [
    ...new Set(events.map((e) => e.user_id).filter(Boolean)),
  ] as string[];
  const terminalIds = [
    ...new Set(events.map((e) => e.terminal_id).filter(Boolean)),
  ] as number[];

  // Batch fetch profiles
  let profilesMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    if (profiles) {
      profilesMap = Object.fromEntries(
        profiles.map((p) => [p.id, p.full_name ?? ""])
      );
    }
  }

  // Batch fetch terminals
  let terminalsMap: Record<number, string> = {};
  if (terminalIds.length > 0) {
    const { data: terminals } = await supabase
      .from("pos_terminals")
      .select("id, name")
      .in("id", terminalIds);
    if (terminals) {
      terminalsMap = Object.fromEntries(
        terminals.map((t) => [t.id, t.name ?? ""])
      );
    }
  }

  // Enrich events with display names
  return events.map((event) => ({
    ...event,
    source_ip: event.source_ip ? String(event.source_ip) : null,
    user_name: event.user_id ? (profilesMap[event.user_id] ?? null) : null,
    terminal_name: event.terminal_id
      ? (terminalsMap[event.terminal_id] ?? null)
      : null,
  }));
}

export async function getSecuritySummary() {
  const { supabase, tenantId } = await getTenantId();

  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: events, error } = await supabase
    .from("security_events")
    .select("severity, event_type")
    .eq("tenant_id", tenantId)
    .gte("created_at", twentyFourHoursAgo);

  if (error) throw new Error(error.message);

  const summary = {
    info: 0,
    warning: 0,
    critical: 0,
    failedLogins: 0,
  };

  if (events) {
    for (const event of events) {
      if (event.severity === "info") summary.info++;
      if (event.severity === "warning") summary.warning++;
      if (event.severity === "critical") summary.critical++;
      if (event.event_type === "failed_login") summary.failedLogins++;
    }
  }

  return summary;
}

// --- Audit Logs ---

export async function getAuditLogs(resourceType?: string) {
  const { supabase, tenantId } = await getTenantId();

  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (resourceType) {
    query = query.eq("resource_type", resourceType);
  }

  const { data: logs, error } = await query;
  if (error) throw new Error(error.message);

  if (!logs || logs.length === 0) return [];

  // Collect unique user_ids for batch lookup
  const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))];

  let profilesMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    if (profiles) {
      profilesMap = Object.fromEntries(
        profiles.map((p) => [p.id, p.full_name ?? ""])
      );
    }
  }

  return logs.map((log) => ({
    ...log,
    ip_address: log.ip_address ? String(log.ip_address) : null,
    user_name: log.user_id ? (profilesMap[log.user_id] ?? null) : null,
  }));
}

export async function getAuditResourceTypes() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("resource_type")
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);

  if (!data) return [];

  // Extract unique resource types
  const types = [...new Set(data.map((d) => d.resource_type))];
  return types.sort();
}
