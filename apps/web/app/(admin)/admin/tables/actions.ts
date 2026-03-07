"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  ADMIN_ROLES,
  TABLE_STATUSES,
  getAdminContext,
  getBranchesForTenant,
  verifyEntityOwnership,
  entityIdSchema,
  createTableSchema,
  updateTableSchema,
  safeDbError,
  safeDbErrorResult,
  withServerAction,
  withServerQuery,
} from "@comtammatu/shared";

const validateId = (id: number) => entityIdSchema.parse(id);

// =====================
// Queries
// =====================

async function _getTables() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data, error } = await supabase
    .from("tables")
    .select("*, branches!inner(tenant_id, name), branch_zones(name)")
    .eq("branches.tenant_id", tenantId)
    .order("branch_id", { ascending: true })
    .order("number", { ascending: true });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getTables = withServerQuery(_getTables);

async function _getBranches() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);
  return getBranchesForTenant(supabase, tenantId);
}

export const getBranches = withServerQuery(_getBranches);

async function _getZones() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data, error } = await supabase
    .from("branch_zones")
    .select("*, branches!inner(tenant_id)")
    .eq("branches.tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getZones = withServerQuery(_getZones);

async function _getTableSummary() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data, error } = await supabase
    .from("tables")
    .select("status, branch_id, branches!inner(tenant_id, name)")
    .eq("branches.tenant_id", tenantId);

  if (error) throw safeDbError(error, "db");

  // Aggregate by branch and status
  const summary: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    const branchName =
      (row.branches as unknown as { name: string })?.name ?? "Unknown";
    if (!summary[branchName]) {
      summary[branchName] = {};
      for (const s of TABLE_STATUSES) summary[branchName][s] = 0;
      summary[branchName]["total"] = 0;
    }
    summary[branchName][row.status] = (summary[branchName][row.status] ?? 0) + 1;
    summary[branchName]["total"] = (summary[branchName]["total"] ?? 0) + 1;
  }

  return summary;
}

export const getTableSummary = withServerQuery(_getTableSummary);

// =====================
// Mutations
// =====================

async function _createTable(formData: FormData) {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const parsed = createTableSchema.safeParse({
    branch_id: formData.get("branch_id"),
    number: formData.get("number"),
    capacity: formData.get("capacity") || undefined,
    zone_id: formData.get("zone_id"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // Verify branch belongs to tenant
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("id", parsed.data.branch_id)
    .eq("tenant_id", tenantId)
    .single();

  if (!branch) {
    return { error: "Chi nhánh không hợp lệ hoặc không thuộc đơn vị của bạn" };
  }

  // Verify zone belongs to same branch
  const { data: zone } = await supabase
    .from("branch_zones")
    .select("id")
    .eq("id", parsed.data.zone_id)
    .eq("branch_id", parsed.data.branch_id)
    .single();

  if (!zone) {
    return { error: "Khu vực không hợp lệ hoặc không thuộc chi nhánh này" };
  }

  const { error } = await supabase.from("tables").insert({
    branch_id: parsed.data.branch_id,
    number: parsed.data.number,
    capacity: parsed.data.capacity ?? null,
    zone_id: parsed.data.zone_id,
    status: "available",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Số bàn đã tồn tại trong chi nhánh này" };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/tables");
  return { error: null };
}

export const createTable = withServerAction(_createTable);

async function _updateTable(id: number, formData: FormData) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const ownership = await verifyEntityOwnership(supabase, "tables", id, tenantId);
  if (ownership.error) return { error: ownership.error };

  const parsed = updateTableSchema.safeParse({
    number: formData.get("number") || undefined,
    capacity: formData.get("capacity") || undefined,
    zone_id: formData.get("zone_id") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.number !== undefined) updateData.number = parsed.data.number;
  if (parsed.data.capacity !== undefined) updateData.capacity = parsed.data.capacity;
  if (parsed.data.zone_id !== undefined) updateData.zone_id = parsed.data.zone_id;

  if (Object.keys(updateData).length === 0) {
    return { error: "Không có dữ liệu cần cập nhật" };
  }

  const { error } = await supabase
    .from("tables")
    .update(updateData)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Số bàn đã tồn tại trong chi nhánh này" };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/tables");
  return { error: null };
}

export const updateTable = withServerAction(_updateTable);

async function _deleteTable(id: number) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const ownership = await verifyEntityOwnership(supabase, "tables", id, tenantId);
  if (ownership.error) return { error: ownership.error };

  // Check table is available before deleting
  const { data: table } = await supabase
    .from("tables")
    .select("status")
    .eq("id", id)
    .single();

  if (table?.status !== "available") {
    return { error: "Chỉ có thể xoá bàn đang trống (available). Vui lòng đổi trạng thái trước." };
  }

  const { error } = await supabase
    .from("tables")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        error: "Không thể xoá bàn này vì đang có đơn hàng liên kết. Vui lòng hoàn tất đơn hàng trước.",
      };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/tables");
  return { error: null };
}

export const deleteTable = withServerAction(_deleteTable);

async function _updateTableStatus(id: number, status: string) {
  validateId(id);
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  if (!TABLE_STATUSES.includes(status as (typeof TABLE_STATUSES)[number])) {
    return { error: "Trạng thái không hợp lệ" };
  }

  const ownership = await verifyEntityOwnership(supabase, "tables", id, tenantId);
  if (ownership.error) return { error: ownership.error };

  const { error } = await supabase
    .from("tables")
    .update({ status })
    .eq("id", id);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/tables");
  return { error: null };
}

export const updateTableStatus = withServerAction(_updateTableStatus);
