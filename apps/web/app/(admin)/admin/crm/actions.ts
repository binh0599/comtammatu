"use server";

import "@/lib/server-bootstrap";
import {
  ActionError,
  getActionContext,
  withServerAction,
  withServerQuery,
  auditLog,
  createCustomerSchema,
  updateCustomerSchema,
  createLoyaltyTierSchema,
  adjustLoyaltyPointsSchema,
  createVoucherSchema,
  respondFeedbackSchema,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

// =====================
// Branches (shared)
// =====================

async function _getBranches() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getBranches = withServerQuery(_getBranches);

// =====================
// Customers
// =====================

async function _getCustomers() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("customers")
    .select("*, loyalty_tiers(name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getCustomers = withServerQuery(_getCustomers);

async function _createCustomer(formData: FormData) {
  const parsed = createCustomerSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    gender: formData.get("gender") || undefined,
    birthday: formData.get("birthday") || undefined,
    source: formData.get("source") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase.from("customers").insert({
    tenant_id: tenantId,
    full_name: parsed.data.full_name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    gender: parsed.data.gender || null,
    birthday: parsed.data.birthday || null,
    source: parsed.data.source || null,
    notes: parsed.data.notes || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Số điện thoại đã tồn tại" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/crm");
  return { success: true };
}

export const createCustomer = withServerAction(_createCustomer);

async function _updateCustomer(id: number, formData: FormData) {
  const parsed = updateCustomerSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    gender: formData.get("gender") || undefined,
    birthday: formData.get("birthday") || undefined,
    source: formData.get("source") || undefined,
    loyalty_tier_id: formData.get("loyalty_tier_id") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("customers")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      gender: parsed.data.gender ?? null,
      birthday: parsed.data.birthday || null,
      source: parsed.data.source ?? null,
      loyalty_tier_id: parsed.data.loyalty_tier_id ?? null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Số điện thoại đã tồn tại" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/crm");
  return { success: true };
}

export const updateCustomer = withServerAction(_updateCustomer);

async function _toggleCustomerActive(id: number) {
  const { supabase, tenantId } = await getActionContext();

  const { data: customer, error: fetchError } = await supabase
    .from("customers")
    .select("is_active")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!customer) return { error: "Khách hàng không tồn tại" };

  const { error } = await supabase
    .from("customers")
    .update({ is_active: !customer.is_active })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

export const toggleCustomerActive = withServerAction(_toggleCustomerActive);

async function _getCustomerLoyaltyHistory(customerId: number) {
  const { supabase } = await getActionContext();

  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export const getCustomerLoyaltyHistory = withServerAction(_getCustomerLoyaltyHistory);

async function _adjustLoyaltyPoints(input: {
  customer_id: number;
  points: number;
  type: string;
  reference_type?: string;
}) {
  const parsed = adjustLoyaltyPointsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase } = await getActionContext();

  const { data: latest } = await supabase
    .from("loyalty_transactions")
    .select("balance_after")
    .eq("customer_id", parsed.data.customer_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const currentBalance = latest?.balance_after ?? 0;
  const newBalance = currentBalance + parsed.data.points;

  if (newBalance < 0) {
    return { error: "Không đủ điểm để thực hiện giao dịch" };
  }

  const { error: txError } = await supabase
    .from("loyalty_transactions")
    .insert({
      customer_id: parsed.data.customer_id,
      points: parsed.data.points,
      type: parsed.data.type,
      balance_after: newBalance,
      reference_type: parsed.data.reference_type || null,
      reference_id: parsed.data.reference_id ?? null,
    });

  if (txError) return { error: txError.message };

  revalidatePath("/admin/crm");
  return { success: true, balance: newBalance };
}

export const adjustLoyaltyPoints = withServerAction(_adjustLoyaltyPoints);

// =====================
// Loyalty Tiers
// =====================

async function _getLoyaltyTiers() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("loyalty_tiers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order")
    .order("min_points");

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
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
    return { error: error.message };
  }

  revalidatePath("/admin/crm");
  return { success: true };
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

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
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

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

export const deleteLoyaltyTier = withServerAction(_deleteLoyaltyTier);

// =====================
// Vouchers
// =====================

async function _getVouchers() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("vouchers")
    .select("*, voucher_branches(branch_id, branches(name))")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getVouchers = withServerQuery(_getVouchers);

async function _createVoucher(data: {
  code: string;
  type: string;
  value: number;
  min_order?: number | null;
  max_discount?: number | null;
  valid_from: string;
  valid_to: string;
  max_uses?: number | null;
  is_active?: boolean;
  branch_ids?: number[];
}) {
  const parsed = createVoucherSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { data: voucher, error: voucherError } = await supabase
    .from("vouchers")
    .insert({
      tenant_id: tenantId,
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      min_order: parsed.data.min_order ?? null,
      max_discount: parsed.data.max_discount ?? null,
      valid_from: parsed.data.valid_from,
      valid_to: parsed.data.valid_to,
      max_uses: parsed.data.max_uses ?? null,
      is_active: parsed.data.is_active ?? true,
    })
    .select("id")
    .single();

  if (voucherError) {
    if (voucherError.code === "23505") {
      return { error: "Mã voucher đã tồn tại" };
    }
    return { error: voucherError.message };
  }

  if (parsed.data.branch_ids && parsed.data.branch_ids.length > 0) {
    const branchRows = parsed.data.branch_ids.map((branchId) => ({
      voucher_id: voucher.id,
      branch_id: branchId,
    }));

    const { error: branchError } = await supabase
      .from("voucher_branches")
      .insert(branchRows);

    if (branchError) {
      await supabase.from("vouchers").delete().eq("id", voucher.id);
      return { error: branchError.message };
    }
  }

  revalidatePath("/admin/crm");
  return { success: true };
}

export const createVoucher = withServerAction(_createVoucher);

async function _updateVoucher(
  id: number,
  data: {
    code?: string;
    type?: string;
    value?: number;
    min_order?: number | null;
    max_discount?: number | null;
    valid_from?: string;
    valid_to?: string;
    max_uses?: number | null;
    is_active?: boolean;
    branch_ids?: number[];
  }
) {
  const { branch_ids, ...voucherData } = data;

  const { supabase, tenantId } = await getActionContext();

  if (Object.keys(voucherData).length > 0) {
    const { error: updateError } = await supabase
      .from("vouchers")
      .update({
        code: voucherData.code,
        type: voucherData.type,
        value: voucherData.value,
        min_order: voucherData.min_order ?? null,
        max_discount: voucherData.max_discount ?? null,
        valid_from: voucherData.valid_from,
        valid_to: voucherData.valid_to,
        max_uses: voucherData.max_uses ?? null,
        is_active: voucherData.is_active,
      })
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (updateError) {
      if (updateError.code === "23505") {
        return { error: "Mã voucher đã tồn tại" };
      }
      return { error: updateError.message };
    }
  }

  if (branch_ids !== undefined) {
    await supabase.from("voucher_branches").delete().eq("voucher_id", id);

    if (branch_ids.length > 0) {
      const branchRows = branch_ids.map((branchId) => ({
        voucher_id: id,
        branch_id: branchId,
      }));

      const { error: branchError } = await supabase
        .from("voucher_branches")
        .insert(branchRows);

      if (branchError) return { error: branchError.message };
    }
  }

  revalidatePath("/admin/crm");
  return { success: true };
}

export const updateVoucher = withServerAction(_updateVoucher);

async function _deleteVoucher(id: number) {
  const { supabase, tenantId } = await getActionContext();

  await supabase.from("voucher_branches").delete().eq("voucher_id", id);

  const { error } = await supabase
    .from("vouchers")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

export const deleteVoucher = withServerAction(_deleteVoucher);

async function _toggleVoucher(id: number) {
  const { supabase, tenantId } = await getActionContext();

  const { data: voucher, error: fetchError } = await supabase
    .from("vouchers")
    .select("is_active")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!voucher) return { error: "Voucher không tồn tại" };

  const { error } = await supabase
    .from("vouchers")
    .update({ is_active: !voucher.is_active })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

export const toggleVoucher = withServerAction(_toggleVoucher);

// =====================
// Feedback
// =====================

async function _getFeedback() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("customer_feedback")
    .select("*, customers(full_name, tenant_id), orders(order_number), branches(name)")
    .eq("branches.tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new ActionError(error.message, "SERVER_ERROR", 500);
  return data ?? [];
}

export const getFeedback = withServerQuery(_getFeedback);

async function _respondToFeedback(id: number, input: { response: string }) {
  const parsed = respondFeedbackSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, userId } = await getActionContext();

  const { error } = await supabase
    .from("customer_feedback")
    .update({
      response: parsed.data.response,
      responded_by: userId,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

export const respondToFeedback = withServerAction(_respondToFeedback);
