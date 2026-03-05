"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  KDS_ROLES,
  getActionContext,
  requireBranch,
  requireRole,
  createPrinterConfigSchema,
  updatePrinterConfigSchema,
  entityIdSchema,
  safeDbErrorResult,
  withServerAction,
  withServerQuery,
} from "@comtammatu/shared";

// ===== Queries =====

async function _getPrintersForBranch() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, KDS_ROLES, "xem cấu hình máy in");
  const { supabase } = ctx;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("printer_configs")
    .select("*")
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getPrintersForBranch = withServerQuery(_getPrintersForBranch);

async function _getKdsStationsForBranch() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, KDS_ROLES, "xem trạm bếp");
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("kds_stations")
    .select("id, name")
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getKdsStationsForBranch = withServerQuery(_getKdsStationsForBranch);

// ===== Mutations =====

async function _createPrinter(formData: FormData) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, KDS_ROLES, "tạo cấu hình máy in");
  const { supabase } = ctx;

  let connectionConfig: Record<string, unknown> = {};
  const rawConfig = formData.get("connection_config");
  if (rawConfig && String(rawConfig).trim()) {
    try {
      connectionConfig = JSON.parse(String(rawConfig));
    } catch {
      return { error: "Cấu hình kết nối không hợp lệ" };
    }
  }

  const parsed = createPrinterConfigSchema.safeParse({
    branch_id: branchId,
    name: formData.get("name"),
    type: formData.get("type"),
    paper_width_mm: formData.get("paper_width_mm"),
    encoding: formData.get("encoding") ?? "utf-8",
    auto_print: formData.get("auto_print") === "true",
    print_delay_ms: formData.get("print_delay_ms") ?? 500,
    connection_config: connectionConfig,
    assigned_to_type: "kds_station",
    assigned_to_id: formData.get("assigned_to_id") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // VALIDATE_CLIENT_IDS
  if (parsed.data.assigned_to_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: station } = await (supabase as any)
      .from("kds_stations")
      .select("id")
      .eq("id", parsed.data.assigned_to_id)
      .eq("branch_id", branchId)
      .maybeSingle();

    if (!station) return { error: "Trạm bếp không thuộc chi nhánh" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("printer_configs")
    .insert({ ...parsed.data, branch_id: branchId });

  if (error) {
    if (error.code === "23505") return { error: "Đã có máy in trùng lặp" };
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/kds/printer");
  return { error: null };
}

export const createPrinter = withServerAction(_createPrinter);

async function _updatePrinter(formData: FormData) {
  const id = entityIdSchema.parse(Number(formData.get("id")));
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, KDS_ROLES, "cập nhật máy in");
  const { supabase } = ctx;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("printer_configs")
    .select("id")
    .eq("id", id)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (!existing) return { error: "Không tìm thấy máy in" };

  const rawUpdates: Record<string, unknown> = {};
  if (formData.has("auto_print")) {
    rawUpdates.auto_print = formData.get("auto_print") === "true";
  }

  if (Object.keys(rawUpdates).length === 0) {
    return { error: "Không có thay đổi" };
  }

  const parsed = updatePrinterConfigSchema.safeParse(rawUpdates);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("printer_configs")
    .update(parsed.data)
    .eq("id", id)
    .eq("branch_id", branchId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/kds/printer");
  return { error: null };
}

export const updatePrinter = withServerAction(_updatePrinter);

async function _deletePrinter(formData: FormData) {
  const id = entityIdSchema.parse(Number(formData.get("id")));
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, KDS_ROLES, "xóa máy in");
  const { supabase } = ctx;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("printer_configs")
    .select("id")
    .eq("id", id)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (!existing) return { error: "Không tìm thấy máy in" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("printer_configs")
    .delete()
    .eq("id", id)
    .eq("branch_id", branchId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/kds/printer");
  return { error: null };
}

export const deletePrinter = withServerAction(_deletePrinter);
