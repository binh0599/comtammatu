"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createLoyaltyTierSchema,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

async function _getLoyaltyTiers() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("loyalty_tiers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order")
    .order("min_points");

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getLoyaltyTiers = withServerQuery(_getLoyaltyTiers);

async function _createLoyaltyTier(formData: FormData) {
  const parsed = createLoyaltyTierSchema.safeParse({
    name: formData.get("name"),
    min_points: formData.get("min_points"),
    discount_pct: formData.get("discount_pct") || undefined,
    benefits: formData.get("benefits") || undefined,
    sort_order: formData.get("sort_order") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase.from("loyalty_tiers").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    min_points: parsed.data.min_points,
    discount_pct: parsed.data.discount_pct ?? null,
    benefits: parsed.data.benefits || null,
    sort_order: parsed.data.sort_order ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Tên hạng đã tồn tại" };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const createLoyaltyTier = withServerAction(_createLoyaltyTier);

async function _updateLoyaltyTier(id: number, formData: FormData) {
  const parsed = createLoyaltyTierSchema.safeParse({
    name: formData.get("name"),
    min_points: formData.get("min_points"),
    discount_pct: formData.get("discount_pct") || undefined,
    benefits: formData.get("benefits") || undefined,
    sort_order: formData.get("sort_order") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("loyalty_tiers")
    .update({
      name: parsed.data.name,
      min_points: parsed.data.min_points,
      discount_pct: parsed.data.discount_pct ?? null,
      benefits: parsed.data.benefits || null,
      sort_order: parsed.data.sort_order ?? null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const updateLoyaltyTier = withServerAction(_updateLoyaltyTier);

async function _deleteLoyaltyTier(id: number) {
  const { supabase, tenantId } = await getActionContext();

  const { count, error: countError } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("loyalty_tier_id", id);

  if (countError) return { error: countError.message };

  if (count && count > 0) {
    return {
      error: `Không thể xóa — có ${count} khách hàng đang ở hạng này`,
    };
  }

  const { error } = await supabase
    .from("loyalty_tiers")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const deleteLoyaltyTier = withServerAction(_deleteLoyaltyTier);
