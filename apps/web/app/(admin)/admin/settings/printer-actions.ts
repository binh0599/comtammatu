"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  ADMIN_ROLES,
  getAdminContext,
  getBranchesForTenant,
  auditLog,
  createPrinterConfigSchema,
  updatePrinterConfigSchema,
  assignPrinterSchema,
  entityIdSchema,
  safeDbError,
  withServerAction,
  withServerQuery,
} from "@comtammatu/shared";

// ===== Helpers =====

/** Safely parse a JSON FormData field. Returns parsed object or validation error. */
function parseJsonField(
  value: FormDataEntryValue | null,
  fallback: Record<string, unknown> | undefined,
): { ok: true; data: Record<string, unknown> | undefined } | { ok: false; error: string } {
  if (!value || String(value).trim() === "") return { ok: true, data: fallback };
  try {
    const parsed = JSON.parse(String(value));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "Cấu hình kết nối không hợp lệ" };
    }
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: "Cấu hình kết nối không hợp lệ (JSON lỗi)" };
  }
}

// ===== Queries =====

async function _getBranches() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);
  return getBranchesForTenant(supabase, tenantId);
}

export const getBranches = withServerQuery(_getBranches);

async function _getPrinterConfigs() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { data, error } = await (supabase as any)
    .from("printer_configs")
    .select("*, branches!inner(tenant_id, name)")
    .eq("branches.tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getPrinterConfigs = withServerQuery(_getPrinterConfigs);

async function _getPrinterForTerminal(terminalId: number) {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { data, error } = await (supabase as any)
    .from("printer_configs")
    .select("*, branches!inner(tenant_id)")
    .eq("branches.tenant_id", tenantId)
    .eq("assigned_to_type", "pos_terminal")
    .eq("assigned_to_id", terminalId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw safeDbError(error, "db");
  return data;
}

export const getPrinterForTerminal = withServerQuery(_getPrinterForTerminal);

async function _getPrinterForStation(stationId: number) {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { data, error } = await (supabase as any)
    .from("printer_configs")
    .select("*, branches!inner(tenant_id)")
    .eq("branches.tenant_id", tenantId)
    .eq("assigned_to_type", "kds_station")
    .eq("assigned_to_id", stationId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw safeDbError(error, "db");
  return data;
}

export const getPrinterForStation = withServerQuery(_getPrinterForStation);

// ===== Mutations =====

async function _createPrinterConfig(formData: FormData) {
  const connectionConfigResult = parseJsonField(formData.get("connection_config"), {});
  if (!connectionConfigResult.ok) {
    return { error: connectionConfigResult.error };
  }

  const parsed = createPrinterConfigSchema.safeParse({
    branch_id: formData.get("branch_id"),
    name: formData.get("name"),
    type: formData.get("type"),
    paper_width_mm: formData.get("paper_width_mm"),
    encoding: formData.get("encoding") ?? "utf-8",
    auto_print: formData.get("auto_print") === "true",
    print_delay_ms: formData.get("print_delay_ms") ?? 500,
    connection_config: connectionConfigResult.data,
    assigned_to_type: formData.get("assigned_to_type") || undefined,
    assigned_to_id: formData.get("assigned_to_id") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  // VALIDATE_CLIENT_IDS: verify branch belongs to caller's tenant
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("id", parsed.data.branch_id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!branch) return { error: "Chi nhánh không tồn tại hoặc không thuộc đơn vị của bạn" };

  const branchId = parsed.data.branch_id;

  // VALIDATE_CLIENT_IDS: verify assigned_to_id belongs to this branch before writing
  if (parsed.data.assigned_to_id && parsed.data.assigned_to_type) {
    const targetTable =
      parsed.data.assigned_to_type === "pos_terminal" ? "pos_terminals" : "kds_stations";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetRow, error: targetError } = await (supabase as any)
      .from(targetTable)
      .select("id")
      .eq("id", parsed.data.assigned_to_id)
      .eq("branch_id", branchId)
      .maybeSingle();

    if (targetError || !targetRow) {
      return { error: "Trạm/máy không thuộc chi nhánh hiện tại hoặc không tồn tại" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { data: created, error } = await (supabase as any)
    .from("printer_configs")
    .insert({ ...parsed.data })
    .select("id");

  if (error) {
    if (error.code === "23505") return { error: "Đã có máy in với thông tin trùng lặp" };
    return { error: "Lỗi tạo cấu hình máy in" };
  }

  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "create",
    resource_type: "printer_config",
    resource_id: created?.[0]?.id ?? 0,
    changes: parsed.data as Record<string, unknown>,
  });

  revalidatePath("/admin/settings");
  return { error: null };
}

export const createPrinterConfig = withServerAction(_createPrinterConfig);

async function _updatePrinterConfig(formData: FormData) {
  const id = entityIdSchema.parse(Number(formData.get("id")));

  const connectionConfigResult = parseJsonField(formData.get("connection_config"), undefined);
  if (!connectionConfigResult.ok) {
    return { error: connectionConfigResult.error };
  }

  const parsed = updatePrinterConfigSchema.safeParse({
    name: formData.get("name") || undefined,
    type: formData.get("type") || undefined,
    paper_width_mm: formData.get("paper_width_mm") || undefined,
    auto_print: formData.has("auto_print")
      ? formData.get("auto_print") === "true"
      : undefined,
    print_delay_ms: formData.get("print_delay_ms") || undefined,
    connection_config: connectionConfigResult.data,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  // Scope update to tenant via branch join — works for all admin roles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { data: existing } = await (supabase as any)
    .from("printer_configs")
    .select("id, branch_id, branches!inner(tenant_id)")
    .eq("id", id)
    .eq("branches.tenant_id", tenantId)
    .maybeSingle();

  if (!existing) return { error: "Không tìm thấy cấu hình máy in" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { data: updated, error } = await (supabase as any)
    .from("printer_configs")
    .update(parsed.data)
    .eq("id", id)
    .eq("branch_id", existing.branch_id)
    .select("id");

  if (error) return { error: "Lỗi cập nhật cấu hình máy in" };
  if (!updated?.length) return { error: "Không tìm thấy cấu hình máy in" };

  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "update",
    resource_type: "printer_config",
    resource_id: id,
    changes: parsed.data as Record<string, unknown>,
  });

  revalidatePath("/admin/settings");
  return { error: null };
}

export const updatePrinterConfig = withServerAction(_updatePrinterConfig);

async function _deletePrinterConfig(formData: FormData) {
  const id = entityIdSchema.parse(Number(formData.get("id")));

  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  // Verify printer belongs to caller's tenant via branch join
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { data: existing } = await (supabase as any)
    .from("printer_configs")
    .select("id, branch_id, branches!inner(tenant_id)")
    .eq("id", id)
    .eq("branches.tenant_id", tenantId)
    .maybeSingle();

  if (!existing) return { error: "Không tìm thấy cấu hình máy in" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { data: deleted, error } = await (supabase as any)
    .from("printer_configs")
    .delete()
    .eq("id", id)
    .eq("branch_id", existing.branch_id)
    .select("id");

  if (error) return { error: "Lỗi xóa cấu hình máy in" };
  if (!deleted?.length) return { error: "Không tìm thấy cấu hình máy in" };

  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "delete",
    resource_type: "printer_config",
    resource_id: id,
  });

  revalidatePath("/admin/settings");
  return { error: null };
}

export const deletePrinterConfig = withServerAction(_deletePrinterConfig);

async function _assignPrinter(formData: FormData) {
  const parsed = assignPrinterSchema.safeParse({
    printer_config_id: formData.get("printer_config_id"),
    assigned_to_type: formData.get("assigned_to_type"),
    assigned_to_id: formData.get("assigned_to_id"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  // Verify the printer belongs to caller's tenant and get its branch_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { data: printer } = await (supabase as any)
    .from("printer_configs")
    .select("id, branch_id, branches!inner(tenant_id)")
    .eq("id", parsed.data.printer_config_id)
    .eq("branches.tenant_id", tenantId)
    .maybeSingle();

  if (!printer) return { error: "Không tìm thấy cấu hình máy in" };

  // VALIDATE_CLIENT_IDS: verify the target terminal/station belongs to the printer's branch
  if (parsed.data.assigned_to_id && parsed.data.assigned_to_type) {
    const targetTable =
      parsed.data.assigned_to_type === "pos_terminal" ? "pos_terminals" : "kds_stations";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetRow, error: targetError } = await (supabase as any)
      .from(targetTable)
      .select("id")
      .eq("id", parsed.data.assigned_to_id)
      .eq("branch_id", printer.branch_id)
      .maybeSingle();

    if (targetError || !targetRow) {
      return { error: "Trạm/máy không thuộc chi nhánh hiện tại hoặc không tồn tại" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { data: updated, error } = await (supabase as any)
    .from("printer_configs")
    .update({
      assigned_to_type: parsed.data.assigned_to_type,
      assigned_to_id: parsed.data.assigned_to_id,
    })
    .eq("id", parsed.data.printer_config_id)
    .eq("branch_id", printer.branch_id)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return { error: "Trạm/máy đã được gán máy in khác" };
    }
    return { error: "Lỗi gán máy in" };
  }
  if (!updated?.length) return { error: "Không tìm thấy cấu hình máy in" };

  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "update",
    resource_type: "printer_config",
    resource_id: parsed.data.printer_config_id,
    changes: parsed.data as Record<string, unknown>,
  });

  revalidatePath("/admin/settings");
  return { error: null };
}

export const assignPrinter = withServerAction(_assignPrinter);
