"use server";

import "@/lib/server-bootstrap";
import { getActionContext, withServerQuery } from "@comtammatu/shared";

// =====================
// Security Events
// =====================

async function _getSecurityEvents(severity?: string) {
  const { supabase, tenantId } = await getActionContext();

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

  const userIds = [
    ...new Set(events.map((e: Record<string, unknown>) => e.user_id).filter(Boolean)),
  ] as string[];
  const terminalIds = [
    ...new Set(events.map((e: Record<string, unknown>) => e.terminal_id).filter(Boolean)),
  ] as number[];

  let profilesMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    if (profiles) {
      profilesMap = Object.fromEntries(
        profiles.map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? ""])
      );
    }
  }

  let terminalsMap: Record<number, string> = {};
  if (terminalIds.length > 0) {
    const { data: terminals } = await supabase
      .from("pos_terminals")
      .select("id, name")
      .in("id", terminalIds);
    if (terminals) {
      terminalsMap = Object.fromEntries(
        terminals.map((t: { id: number; name: string | null }) => [t.id, t.name ?? ""])
      );
    }
  }

  return events.map((event: Record<string, unknown>) => ({
    ...event,
    source_ip: event.source_ip ? String(event.source_ip) : null,
    user_name: event.user_id ? (profilesMap[event.user_id as string] ?? null) : null,
    terminal_name: event.terminal_id ? (terminalsMap[event.terminal_id as number] ?? null) : null,
  }));
}

export const getSecurityEvents = withServerQuery(_getSecurityEvents);

async function _getSecuritySummary() {
  const { supabase, tenantId } = await getActionContext();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await supabase
    .from("security_events")
    .select("severity, event_type")
    .eq("tenant_id", tenantId)
    .gte("created_at", twentyFourHoursAgo);

  if (error) throw new Error(error.message);

  const summary = { info: 0, warning: 0, critical: 0, failedLogins: 0 };

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

export const getSecuritySummary = withServerQuery(_getSecuritySummary);

// =====================
// Audit Logs
// =====================

async function _getAuditLogs(resourceType?: string) {
  const { supabase, tenantId } = await getActionContext();

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

  const userIds = [
    ...new Set(logs.map((l: Record<string, unknown>) => l.user_id).filter(Boolean)),
  ] as string[];

  let profilesMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    if (profiles) {
      profilesMap = Object.fromEntries(
        profiles.map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? ""])
      );
    }
  }

  return logs.map((log: Record<string, unknown>) => ({
    ...log,
    ip_address: log.ip_address ? String(log.ip_address) : null,
    user_name: log.user_id ? (profilesMap[log.user_id as string] ?? null) : null,
  }));
}

export const getAuditLogs = withServerQuery(_getAuditLogs);

async function _getAuditResourceTypes() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("resource_type")
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);

  if (!data) return [];

  const types = [...new Set<string>(data.map((d: { resource_type: string }) => d.resource_type))];
  return types.sort();
}

export const getAuditResourceTypes = withServerQuery(_getAuditResourceTypes);
