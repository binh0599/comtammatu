"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  ADMIN_ROLES,
  getAdminContext,
  getBranchesForTenant,
  getBranchIdsForTenant,
  entityIdSchema,
  withServerAction,
  withServerQuery,
} from "@comtammatu/shared";

// =====================
// Branches (shared)
// =====================

async function _getBranches() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);
  return getBranchesForTenant(supabase, tenantId);
}

export const getBranches = withServerQuery(_getBranches);

// =====================
// Payments
// =====================

async function _getPayments() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return [];

  // Get terminals for those branches
  const { data: terminals, error: termError } = await supabase
    .from("pos_terminals")
    .select("id")
    .in("branch_id", branchIds);

  if (termError) throw new Error(termError.message);
  if (!terminals || terminals.length === 0) return [];

  const terminalIds = terminals.map((t: { id: number }) => t.id);

  // Get payments with related data
  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      id,
      order_id,
      terminal_id,
      method,
      provider,
      amount,
      tip,
      reference_no,
      status,
      paid_at,
      created_at,
      orders(id, order_number, total, type),
      pos_terminals(id, name, branch_id, branches(id, name))
    `
    )
    .in("terminal_id", terminalIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getPayments = withServerQuery(_getPayments);

// =====================
// Refund Payment
// =====================

async function _refundPayment(
  paymentId: number
): Promise<{ error?: string }> {
  entityIdSchema.parse(paymentId);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // Verify payment belongs to this tenant
  const { data: payment, error: fetchErr } = await supabase
    .from("payments")
    .select(
      `
      id,
      status,
      pos_terminals(branch_id, branches(tenant_id))
    `
    )
    .eq("id", paymentId)
    .single();

  if (fetchErr || !payment) {
    return { error: "Không tìm thấy thanh toán" };
  }

  // Verify tenant ownership
  const terminal = payment.pos_terminals as unknown as {
    branch_id: number;
    branches: { tenant_id: number };
  };
  if (terminal?.branches?.tenant_id !== tenantId) {
    return { error: "Không có quyền truy cập" };
  }

  // Only completed payments can be refunded
  if (payment.status !== "completed") {
    return { error: "Chỉ có thể hoàn tiền cho thanh toán đã hoàn tất" };
  }

  // Atomic conditional update to prevent race conditions
  const { data: updated, error: updateErr } = await supabase
    .from("payments")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("status", "completed")
    .select("id")
    .maybeSingle();

  if (updateErr) {
    return { error: updateErr.message };
  }
  if (!updated) {
    return { error: "Thanh toán đã được xử lý bởi người khác" };
  }

  revalidatePath("/admin/payments");
  return {};
}

export const refundPayment = withServerAction(_refundPayment);
