"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  ADMIN_ROLES,
  getAdminContext,
  auditLog,
  createPrinterConfigSchema,
  updatePrinterConfigSchema,
  assignPrinterSchema,
  safeDbError,
  withServerAction,
  withServerQuery,
} from "@comtammatu/shared";

// ===== Queries =====

async function _getPrinterConfigs() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { supabase, branchId } = await getAdminContext(ADMIN_ROLES) as any;
  if (!branchId) return [];

  const { data, error } = await (supabase as any)
    .from("printer_configs")
    .select("*")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getPrinterConfigs = withServerQuery(_getPrinterConfigs);

async function _getPrinterForTerminal(terminalId: number) {
  const { supabase, branchId } = await getAdminContext(ADMIN_ROLES) as any;
  if (!branchId) return null;

  const { data, error } = await (supabase as any)
    .from("printer_configs")
    .select("*")
    .eq("branch_id", branchId)
    .eq("assigned_to_type", "pos_terminal")
    .eq("assigned_to_id", terminalId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw safeDbError(error, "db");
  return data;
}

export const getPrinterForTerminal = withServerQuery(_getPrinterForTerminal);

async function _getPrinterForStation(stationId: number) {
  const { supabase, branchId } = await getAdminContext(ADMIN_ROLES) as any;
  if (!branchId) return null;

  const { data, error } = await (supabase as any)
    .from("printer_configs")
    .select("*")
    .eq("branch_id", branchId)
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
  const parsed = createPrinterConfigSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    paper_width_mm: formData.get("paper_width_mm"),
    encoding: formData.get("encoding") ?? "utf-8",
    auto_print: formData.get("auto_print") === "true",
    print_delay_ms: formData.get("print_delay_ms") ?? 500,
    connection_config: formData.get("connection_config")
      ? JSON.parse(formData.get("connection_config") as string)
      : {},
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, branchId, userId } = await getAdminContext(ADMIN_ROLES);
  if (!branchId) return { error: "Không tìm thấy chi nhánh" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { error } = await (supabase as any).from("printer_configs").insert({
    branch_id: branchId,
    ...parsed.data,
  });

  if (error) {
    if (error.code === "23505") return { error: "Đã có máy in với thông tin trùng lặp" };
    return { error: "Lỗi tạo cấu hình máy in" };
  }

  await auditLog(supabase, {
    tenant_id: tenantId,
    user_id: userId,
    action: "create",
    resource_type: "printer_config",
    resource_id: 0,
    changes: parsed.data as Record<string, unknown>,
  });

  revalidatePath("/admin/settings");
  return { error: null };
}

export const createPrinterConfig = withServerAction(_createPrinterConfig);

async function _updatePrinterConfig(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id || isNaN(id)) return { error: "ID không hợp lệ" };

  const parsed = updatePrinterConfigSchema.safeParse({
    name: formData.get("name") || undefined,
    type: formData.get("type") || undefined,
    paper_width_mm: formData.get("paper_width_mm") || undefined,
    auto_print: formData.has("auto_print")
      ? formData.get("auto_print") === "true"
      : undefined,
    print_delay_ms: formData.get("print_delay_ms") || undefined,
    connection_config: formData.get("connection_config")
      ? JSON.parse(formData.get("connection_config") as string)
      : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, branchId, userId } = await getAdminContext(ADMIN_ROLES);
  if (!branchId) return { error: "Không tìm thấy chi nhánh" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { error } = await (supabase as any)
    .from("printer_configs")
    .update(parsed.data)
    .eq("id", id)
    .eq("branch_id", branchId);

  if (error) return { error: "Lỗi cập nhật cấu hình máy in" };

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
  const id = Number(formData.get("id"));
  if (!id || isNaN(id)) return { error: "ID không hợp lệ" };

  const { supabase, tenantId, branchId, userId } = await getAdminContext(ADMIN_ROLES);
  if (!branchId) return { error: "Không tìm thấy chi nhánh" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { error } = await (supabase as any)
    .from("printer_configs")
    .delete()
    .eq("id", id)
    .eq("branch_id", branchId);

  if (error) return { error: "Lỗi xóa cấu hình máy in" };

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

  const { supabase, tenantId, branchId, userId } = await getAdminContext(ADMIN_ROLES);
  if (!branchId) return { error: "Không tìm thấy chi nhánh" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- printer_configs not in generated types yet
  const { error } = await (supabase as any)
    .from("printer_configs")
    .update({
      assigned_to_type: parsed.data.assigned_to_type,
      assigned_to_id: parsed.data.assigned_to_id,
    })
    .eq("id", parsed.data.printer_config_id)
    .eq("branch_id", branchId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Trạm/máy đã được gán máy in khác" };
    }
    return { error: "Lỗi gán máy in" };
  }

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
