"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import {
  createCustomerSchema,
  updateCustomerSchema,
  createLoyaltyTierSchema,
  adjustLoyaltyPointsSchema,
  createVoucherSchema,
  respondFeedbackSchema,
} from "@comtammatu/shared";

// --- Helper: Get tenant_id + userId from authenticated user ---

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.tenant_id;
  if (!tenantId) throw new Error("No tenant assigned");

  return { supabase, tenantId, userId: user.id };
}

// =====================
// Branches (shared)
// =====================

export async function getBranches() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

// =====================
// Customers
// =====================

export async function getCustomers() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("customers")
    .select("*, loyalty_tiers(name)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCustomer(formData: FormData) {
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
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, tenantId } = await getTenantId();

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
      return { error: "So dien thoai da ton tai" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/crm");
  return { success: true };
}

export async function updateCustomer(id: number, formData: FormData) {
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
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase } = await getTenantId();

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
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "So dien thoai da ton tai" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/crm");
  return { success: true };
}

export async function toggleCustomerActive(id: number) {
  const { supabase } = await getTenantId();

  // Fetch current state
  const { data: customer, error: fetchError } = await supabase
    .from("customers")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!customer) return { error: "Khach hang khong ton tai" };

  const { error } = await supabase
    .from("customers")
    .update({ is_active: !customer.is_active })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

export async function getCustomerLoyaltyHistory(customerId: number) {
  const { supabase } = await getTenantId();

  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function adjustLoyaltyPoints(input: {
  customer_id: number;
  points: number;
  type: string;
  reference_type?: string;
}) {
  const parsed = adjustLoyaltyPointsSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase } = await getTenantId();

  // Get current balance from latest transaction
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
    return { error: "Khong du diem de thuc hien giao dich" };
  }

  // Insert loyalty transaction
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

  // Update customer total (total_spent is separate, we track points via transactions)
  // No loyalty_points column on customers table, balance is derived from transactions

  revalidatePath("/admin/crm");
  return { success: true, balance: newBalance };
}

// =====================
// Loyalty Tiers
// =====================

export async function getLoyaltyTiers() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("loyalty_tiers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order")
    .order("min_points");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createLoyaltyTier(formData: FormData) {
  const parsed = createLoyaltyTierSchema.safeParse({
    name: formData.get("name"),
    min_points: formData.get("min_points"),
    discount_pct: formData.get("discount_pct") || undefined,
    benefits: formData.get("benefits") || undefined,
    sort_order: formData.get("sort_order") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, tenantId } = await getTenantId();

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
      return { error: "Ten hang da ton tai" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/crm");
  return { success: true };
}

export async function updateLoyaltyTier(id: number, formData: FormData) {
  const parsed = createLoyaltyTierSchema.safeParse({
    name: formData.get("name"),
    min_points: formData.get("min_points"),
    discount_pct: formData.get("discount_pct") || undefined,
    benefits: formData.get("benefits") || undefined,
    sort_order: formData.get("sort_order") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase } = await getTenantId();

  const { error } = await supabase
    .from("loyalty_tiers")
    .update({
      name: parsed.data.name,
      min_points: parsed.data.min_points,
      discount_pct: parsed.data.discount_pct ?? null,
      benefits: parsed.data.benefits || null,
      sort_order: parsed.data.sort_order ?? null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

export async function deleteLoyaltyTier(id: number) {
  const { supabase } = await getTenantId();

  // Check if any customers are linked to this tier
  const { count, error: countError } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("loyalty_tier_id", id);

  if (countError) return { error: countError.message };

  if (count && count > 0) {
    return {
      error: `Khong the xoa — co ${count} khach hang dang o hang nay`,
    };
  }

  const { error } = await supabase.from("loyalty_tiers").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

// =====================
// Vouchers
// =====================

export async function getVouchers() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("vouchers")
    .select("*, voucher_branches(branch_id, branches(name))")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createVoucher(data: {
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
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, tenantId } = await getTenantId();

  // Insert voucher
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
      return { error: "Ma voucher da ton tai" };
    }
    return { error: voucherError.message };
  }

  // Insert voucher_branches if provided
  if (parsed.data.branch_ids && parsed.data.branch_ids.length > 0) {
    const branchRows = parsed.data.branch_ids.map((branchId) => ({
      voucher_id: voucher.id,
      branch_id: branchId,
    }));

    const { error: branchError } = await supabase
      .from("voucher_branches")
      .insert(branchRows);

    if (branchError) {
      // Rollback voucher on branch insert failure
      await supabase.from("vouchers").delete().eq("id", voucher.id);
      return { error: branchError.message };
    }
  }

  revalidatePath("/admin/crm");
  return { success: true };
}

export async function updateVoucher(
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

  const { supabase } = await getTenantId();

  // Update voucher fields
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
      .eq("id", id);

    if (updateError) {
      if (updateError.code === "23505") {
        return { error: "Ma voucher da ton tai" };
      }
      return { error: updateError.message };
    }
  }

  // Replace voucher_branches
  if (branch_ids !== undefined) {
    // Delete old branches
    await supabase.from("voucher_branches").delete().eq("voucher_id", id);

    // Insert new branches
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

export async function deleteVoucher(id: number) {
  const { supabase } = await getTenantId();

  // Delete voucher_branches first (cascade should handle, but be explicit)
  await supabase.from("voucher_branches").delete().eq("voucher_id", id);

  const { error } = await supabase.from("vouchers").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

export async function toggleVoucher(id: number) {
  const { supabase } = await getTenantId();

  const { data: voucher, error: fetchError } = await supabase
    .from("vouchers")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!voucher) return { error: "Voucher khong ton tai" };

  const { error } = await supabase
    .from("vouchers")
    .update({ is_active: !voucher.is_active })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

// =====================
// Feedback
// =====================

export async function getFeedback() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("customer_feedback")
    .select("*, customers(full_name, tenant_id), orders(order_number), branches(name)")
    .eq("branches.tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  // Filter by tenant_id via customers join
  return data ?? [];
}

export async function respondToFeedback(id: number, input: { response: string }) {
  const parsed = respondFeedbackSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Du lieu khong hop le" };
  }

  const { supabase, userId } = await getTenantId();

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

// =====================
// GDPR / Deletion Requests
// =====================

export async function getDeletionRequests() {
  const { supabase, tenantId } = await getTenantId();

  const { data, error } = await supabase
    .from("deletion_requests")
    .select("*, customers!inner(full_name, email, tenant_id)")
    .eq("customers.tenant_id", tenantId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function cancelDeletionRequest(id: number) {
  const { supabase } = await getTenantId();

  const { error } = await supabase
    .from("deletion_requests")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/crm");
  return { success: true };
}

export async function processDeletion(id: number) {
  const { supabase, userId } = await getTenantId();

  // Get the deletion request to find the customer
  const { data: request, error: fetchError } = await supabase
    .from("deletion_requests")
    .select("customer_id")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!request) return { error: "Yeu cau khong ton tai" };

  // Anonymize customer data
  const { error: anonError } = await supabase
    .from("customers")
    .update({
      full_name: "[Da xoa]",
      phone: "[Da xoa]",
      email: null,
      is_active: false,
      notes: null,
      birthday: null,
      gender: null,
    })
    .eq("id", request.customer_id);

  if (anonError) return { error: anonError.message };

  // Mark deletion request as completed
  const { error: updateError } = await supabase
    .from("deletion_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      processed_by: userId,
    })
    .eq("id", id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/admin/crm");
  return { success: true };
}
