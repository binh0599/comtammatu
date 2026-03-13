"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  POS_ROLES,
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

async function _getCurrentTerminal() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, POS_ROLES, "xem cấu hình máy in");
  const { supabase, userId } = ctx;

  // Try to find terminal from active POS session scoped to current branch
  const { data: session } = await supabase
    .from("pos_sessions")
    .select("terminal_id, pos_terminals(id, name, type)")
    .eq("cashier_id", userId)
    .eq("branch_id", branchId)
    .eq("status", "open")
    .maybeSingle();

  if (session?.terminal_id) {
    const terminal = session.pos_terminals as { id: number; name: string; type: string } | null;
    return { id: session.terminal_id, name: terminal?.name ?? `Máy #${session.terminal_id}`, type: terminal?.type ?? "cashier_station" };
  }

  return null;
}

export const getCurrentTerminal = withServerQuery(_getCurrentTerminal);

async function _getPrintersForTerminal(terminalId: number) {
  const parsedId = entityIdSchema.parse(terminalId);
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, POS_ROLES, "xem cấu hình máy in");
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("printer_configs")
    .select("*")
    .eq("branch_id", branchId)
    .eq("assigned_to_type", "pos_terminal")
    .eq("assigned_to_id", parsedId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getPrintersForTerminal = withServerQuery(_getPrintersForTerminal);

async function _getPrintersForBranch() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, POS_ROLES, "xem cấu hình máy in");
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("printer_configs")
    .select("*")
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getPrintersForBranch = withServerQuery(_getPrintersForBranch);

async function _getTerminalsForBranch() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, POS_ROLES, "xem thiết bị");
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("pos_terminals")
    .select("id, name, type")
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .not("approved_at", "is", null)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getTerminalsForBranch = withServerQuery(_getTerminalsForBranch);

async function _getKdsStationsForBranch() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, POS_ROLES, "xem trạm bếp");
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
  requireRole(ctx.userRole, POS_ROLES, "tạo cấu hình máy in");
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
    assigned_to_type: formData.get("assigned_to_type") || undefined,
    assigned_to_id: formData.get("assigned_to_id") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  // VALIDATE_CLIENT_IDS: verify assigned_to_id belongs to this branch
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
      return { error: "Trạm/máy không thuộc chi nhánh hiện tại" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from("printer_configs")
    .insert({ ...parsed.data, branch_id: branchId } as any);

  if (error) {
    if (error.code === "23505") return { error: "Đã có máy in trùng lặp" };
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/pos/printer");
  return { error: null };
}

export const createPrinter = withServerAction(_createPrinter);

async function _updatePrinter(formData: FormData) {
  const id = entityIdSchema.parse(Number(formData.get("id")));
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, POS_ROLES, "cập nhật máy in");
  const { supabase } = ctx;

  const { data: existing } = await supabase
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
  const { error } = await supabase
    .from("printer_configs")
    .update(parsed.data as any)
    .eq("id", id)
    .eq("branch_id", branchId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/pos/printer");
  return { error: null };
}

export const updatePrinter = withServerAction(_updatePrinter);

async function _deletePrinter(formData: FormData) {
  const id = entityIdSchema.parse(Number(formData.get("id")));
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  requireRole(ctx.userRole, POS_ROLES, "xóa máy in");
  const { supabase } = ctx;

  const { data: existing } = await supabase
    .from("printer_configs")
    .select("id")
    .eq("id", id)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (!existing) return { error: "Không tìm thấy máy in" };

  const { error } = await supabase
    .from("printer_configs")
    .delete()
    .eq("id", id)
    .eq("branch_id", branchId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/pos/printer");
  return { error: null };
}

export const deletePrinter = withServerAction(_deletePrinter);
