"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import { ADMIN_ROLES } from "@comtammatu/shared";

// --- Helper: Get tenant_id + role from authenticated user ---

async function getAdminContext() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.tenant_id;
  const role = profile?.role;
  if (!tenantId) throw new Error("No tenant assigned");
  if (!role || !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
    throw new Error("Insufficient permissions");
  }

  return { supabase, tenantId, userId: user.id, role };
}

// =====================
// Branches (shared)
// =====================

export async function getBranches() {
  const { supabase, tenantId } = await getAdminContext();

  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

// =====================
// Payments
// =====================

export async function getPayments() {
  const { supabase, tenantId } = await getAdminContext();

  // Get all branch IDs for this tenant
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("tenant_id", tenantId);

  if (branchError) throw new Error(branchError.message);
  if (!branches || branches.length === 0) return [];

  const branchIds = branches.map((b) => b.id);

  // Get terminals for those branches
  const { data: terminals, error: termError } = await supabase
    .from("pos_terminals")
    .select("id")
    .in("branch_id", branchIds);

  if (termError) throw new Error(termError.message);
  if (!terminals || terminals.length === 0) return [];

  const terminalIds = terminals.map((t) => t.id);

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
  const { supabase, tenantId } = await getAdminContext();

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
    return { error: "Khong tim thay thanh toan" };
  }

  // Verify tenant ownership
  const terminal = payment.pos_terminals as unknown as {
    branch_id: number;
    branches: { tenant_id: number };
  };
  if (terminal?.branches?.tenant_id !== tenantId) {
    return { error: "Khong co quyen truy cap" };
  }

  // Only completed payments can be refunded
  if (payment.status !== "completed") {
    return { error: "Chi co the hoan tien cho thanh toan da hoan tat" };
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
