/**
 * Audit logging helpers for Server Actions.
 * Inserts records into audit_logs table for compliance (PCI DSS Req 10, GDPR Art 32).
 *
 * IMPORTANT: Only import in server-side code. Never in "use client" files.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

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
 * Insert an audit log entry. Fire-and-forget: does not throw on failure
 * (audit logging should never break the primary operation).
 */
export async function auditLog(
  supabase: SupabaseClient,
  entry: AuditLogEntry,
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      tenant_id: entry.tenant_id,
      user_id: entry.user_id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: String(entry.resource_id),
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      ip_address: entry.ip_address ?? null,
    });
  } catch (error) {
    // Audit logging failure should not block the operation.
    // Log to console for server-side observability.
    console.error("[AuditLog] Failed to insert audit log:", error);
  }
}

export interface SecurityEventEntry {
  tenant_id: number | null;
  event_type: string;
  severity: "info" | "warning" | "critical";
  description: string;
  user_id?: string | null;
  source_ip?: string | null;
}

/**
 * Insert a security event. Fire-and-forget.
 */
export async function logSecurityEvent(
  supabase: SupabaseClient,
  entry: SecurityEventEntry,
): Promise<void> {
  try {
    await supabase.from("security_events").insert({
      tenant_id: entry.tenant_id,
      event_type: entry.event_type,
      severity: entry.severity,
      description: entry.description,
      user_id: entry.user_id ?? null,
      source_ip: entry.source_ip ?? null,
    });
  } catch (error) {
    console.error("[SecurityEvent] Failed to insert security event:", error);
  }
}
