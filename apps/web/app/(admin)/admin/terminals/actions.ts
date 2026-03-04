"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  ADMIN_ROLES,
  getAdminContext,
  getBranchesForTenant,
  verifyEntityOwnership,
  entityIdSchema,
  safeDbErrorResult,
  withServerAction,
  withServerQuery,
} from "@comtammatu/shared";
import { z } from "zod";

const terminalSchema = z.object({
  name: z.string().min(1, "Tên thiết bị không được để trống"),
  type: z.enum(["mobile_order", "cashier_station"]),
  branch_id: z.coerce.number().positive(),
  device_fingerprint: z.string().min(1, "Mã thiết bị không được để trống"),
});

const validateId = (id: number) => entityIdSchema.parse(id);

// =====================
// Queries
// =====================

async function _getTerminals() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data, error } = await supabase
    .from("pos_terminals")
    .select("*, branches!inner(tenant_id, name)")
    .eq("branches.tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getTerminals = withServerQuery(_getTerminals);

async function _getBranches() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);
  return getBranchesForTenant(supabase, tenantId);
}

export const getBranches = withServerQuery(_getBranches);

// =====================
// Mutations
// =====================

async function _createTerminal(formData: FormData) {
  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  const parsed = terminalSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    branch_id: formData.get("branch_id"),
    device_fingerprint: formData.get("device_fingerprint"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // Verify branch belongs to caller's tenant
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("id", parsed.data.branch_id)
    .eq("tenant_id", tenantId)
    .single();

  if (!branch) {
    return { error: "Chi nhánh không hợp lệ hoặc không thuộc đơn vị của bạn" };
  }

  const { error } = await supabase.from("pos_terminals").insert({
    name: parsed.data.name,
    type: parsed.data.type,
    branch_id: parsed.data.branch_id,
    device_fingerprint: parsed.data.device_fingerprint,
    registered_by: userId,
    is_active: false,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Mã thiết bị đã tồn tại" };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/terminals");
  return { error: null };
}

export const createTerminal = withServerAction(_createTerminal);

async function _approveTerminal(id: number) {
  validateId(id);
  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  const ownership = await verifyEntityOwnership(supabase, "pos_terminals", id, tenantId);
  if (ownership.error) return { error: ownership.error };

  // Check if already approved — idempotent guard
  const { data: existing } = await supabase
    .from("pos_terminals")
    .select("approved_at")
    .eq("id", id)
    .single();

  if (existing?.approved_at) {
    return { error: "Thiết bị đã được phê duyệt trước đó" };
  }

  const { error } = await supabase
    .from("pos_terminals")
    .update({
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/terminals");
  return { error: null };
}

export const approveTerminal = withServerAction(_approveTerminal);

async function _toggleTerminal(id: number) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const ownership = await verifyEntityOwnership(supabase, "pos_terminals", id, tenantId);
  if (ownership.error) return { error: ownership.error };

  const { data: terminal, error: fetchError } = await supabase
    .from("pos_terminals")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase
    .from("pos_terminals")
    .update({ is_active: !terminal.is_active })
    .eq("id", id);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/terminals");
  return { error: null };
}

export const toggleTerminal = withServerAction(_toggleTerminal);

async function _deleteTerminal(id: number) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const ownership = await verifyEntityOwnership(supabase, "pos_terminals", id, tenantId);
  if (ownership.error) return { error: ownership.error };

  const { error } = await supabase
    .from("pos_terminals")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/terminals");
  return { error: null };
}

export const deleteTerminal = withServerAction(_deleteTerminal);
