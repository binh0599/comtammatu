"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  ADMIN_ROLES,
  getAdminContext,
  getBranchesForTenant,
  getBranchIdsForTenant,
} from "@comtammatu/shared";

// =====================
// Branches (shared)
// =====================

export async function getBranches() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);
  return getBranchesForTenant(supabase, tenantId);
}

// =====================
// Payments
// =====================

export async function getPayments() {
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

// =====================
// Refund Payment
// =====================

export async function refundPayment(
  paymentId: number
): Promise<{ error?: string }> {
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

  const { error: updateErr } = await supabase
    .from("payments")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  revalidatePath("/admin/payments");
  return {};
}
