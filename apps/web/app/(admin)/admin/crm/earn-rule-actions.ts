"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createEarnRuleSchema,
  entityIdSchema,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// getEarnRules
// ---------------------------------------------------------------------------

async function _getEarnRules() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("loyalty_earn_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getEarnRules = withServerQuery(_getEarnRules);

// ---------------------------------------------------------------------------
// createEarnRule
// ---------------------------------------------------------------------------

async function _createEarnRule(formData: FormData) {
  const parsed = createEarnRuleSchema.safeParse({
    name: formData.get("name"),
    points_per_unit: formData.get("points_per_unit"),
    unit_amount: formData.get("unit_amount"),
    min_order_total: formData.get("min_order_total") || undefined,
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase.from("loyalty_earn_rules").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    points_per_unit: parsed.data.points_per_unit,
    unit_amount: parsed.data.unit_amount,
    min_order_total: parsed.data.min_order_total ?? 0,
    is_active: parsed.data.is_active,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Quy tắc đã tồn tại" };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const createEarnRule = withServerAction(_createEarnRule);

// ---------------------------------------------------------------------------
// updateEarnRule
// ---------------------------------------------------------------------------

async function _updateEarnRule(id: number, formData: FormData) {
  entityIdSchema.parse(id);
  const parsed = createEarnRuleSchema.safeParse({
    name: formData.get("name"),
    points_per_unit: formData.get("points_per_unit"),
    unit_amount: formData.get("unit_amount"),
    min_order_total: formData.get("min_order_total") || undefined,
    is_active: formData.get("is_active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { data: updated, error } = await supabase
    .from("loyalty_earn_rules")
    .update({
      name: parsed.data.name,
      points_per_unit: parsed.data.points_per_unit,
      unit_amount: parsed.data.unit_amount,
      min_order_total: parsed.data.min_order_total ?? 0,
      is_active: parsed.data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("id")
    .maybeSingle();

  if (error) return safeDbErrorResult(error, "db");
  if (!updated) return { error: "Quy tắc không tồn tại hoặc không thuộc đơn vị của bạn" };

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const updateEarnRule = withServerAction(_updateEarnRule);

// ---------------------------------------------------------------------------
// deleteEarnRule
// ---------------------------------------------------------------------------

async function _deleteEarnRule(id: number) {
  entityIdSchema.parse(id);
  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("loyalty_earn_rules")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const deleteEarnRule = withServerAction(_deleteEarnRule);

// ---------------------------------------------------------------------------
// toggleEarnRule — quick is_active toggle
// ---------------------------------------------------------------------------

async function _toggleEarnRule(id: number) {
  entityIdSchema.parse(id);
  const { supabase, tenantId } = await getActionContext();

  const { data: rule, error: fetchError } = await supabase
    .from("loyalty_earn_rules")
    .select("is_active")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!rule) return { error: "Quy tắc không tồn tại" };

  const { error } = await supabase
    .from("loyalty_earn_rules")
    .update({ is_active: !rule.is_active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const toggleEarnRule = withServerAction(_toggleEarnRule);
