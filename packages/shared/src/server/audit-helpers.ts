/**
 * Audit logging helpers for Server Actions.
 * Inserts records into audit_logs table for compliance (PCI DSS Req 10, GDPR Art 32).
 *
 * IMPORTANT: Only import in server-side code. Never in "use client" files.
 */

import type { SupabaseClient } from "./action-context";

/** Payload for inserting a row into the audit_logs table (PCI DSS Req 10). */
export interface AuditLogEntry {
  tenant_id: number;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: number | string;
  changes?: Record<string, unknown>;
  ip_address?: string | null;
}

/**
 * Insert an audit log entry with one retry on failure.
 * Fire-and-forget: does not throw (audit logging should never break the primary operation).
 * Logs structured errors for server-side observability (PCI DSS compliance).
 */
export async function auditLog(supabase: SupabaseClient, entry: AuditLogEntry): Promise<void> {
  const payload = {
    tenant_id: entry.tenant_id,
    user_id: entry.user_id,
    action: entry.action,
    resource_type: entry.resource_type,
    resource_id:
      typeof entry.resource_id === "string" ? Number(entry.resource_id) : entry.resource_id,
    new_value: entry.changes
      ? JSON.parse(
          JSON.stringify(entry.changes, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        )
      : null,
    ip_address: entry.ip_address ?? null,
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { error } = await supabase.from("audit_logs").insert(payload);
      if (!error) return;
      if (attempt === 0) {
        console.warn("[AuditLog] Insert failed, retrying:", {
          action: entry.action,
          resource: `${entry.resource_type}:${entry.resource_id}`,
          error: error.message,
        });
        continue;
      }
      console.error("[AuditLog] Insert failed after retry:", {
        action: entry.action,
        resource: `${entry.resource_type}:${entry.resource_id}`,
        tenant_id: entry.tenant_id,
        error: error.message,
        code: error.code,
      });
    } catch (error) {
      console.error("[AuditLog] Unexpected error:", {
        action: entry.action,
        resource: `${entry.resource_type}:${entry.resource_id}`,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }
}

/** Payload for inserting a row into the security_events table. tenant_id is null for system-level events. */
export interface SecurityEventEntry {
  tenant_id: number | null;
  event_type: string;
  severity: "info" | "warning" | "critical";
  description: string;
  user_id?: string | null;
  source_ip?: string | null;
}

/**
 * Insert a security event with one retry on failure.
 * Fire-and-forget: does not throw. Logs structured errors for observability.
 */
export async function logSecurityEvent(
  supabase: SupabaseClient,
  entry: SecurityEventEntry
): Promise<void> {
  const payload = {
    tenant_id: entry.tenant_id,
    event_type: entry.event_type,
    severity: entry.severity,
    description: entry.description,
    user_id: entry.user_id ?? null,
    source_ip: entry.source_ip ?? null,
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { error } = await supabase.from("security_events").insert(payload);
      if (!error) return;
      if (attempt === 0) {
        console.warn("[SecurityEvent] Insert failed, retrying:", {
          event_type: entry.event_type,
          severity: entry.severity,
          error: error.message,
        });
        continue;
      }
      console.error("[SecurityEvent] Insert failed after retry:", {
        event_type: entry.event_type,
        severity: entry.severity,
        tenant_id: entry.tenant_id,
        error: error.message,
        code: error.code,
      });
    } catch (error) {
      console.error("[SecurityEvent] Unexpected error:", {
        event_type: entry.event_type,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }
}
