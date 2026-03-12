"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createCustomerSchema,
  updateCustomerSchema,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

// =====================
// CRM Stats
// =====================

export interface CrmStats {
  totalCustomers: number;
  activeCustomers: number;
  totalVouchers: number;
  activeVouchers: number;
  avgRating: number;
  totalFeedback: number;
  pendingFeedback: number;
}

async function _getCrmStats(): Promise<CrmStats> {
  const { supabase, tenantId } = await getActionContext();

  const [customersResult, activeCustomersResult, vouchersResult, activeVouchersResult, feedbackResult, pendingFeedbackResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
    supabase
      .from("vouchers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("vouchers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
    supabase
      .from("customer_feedback")
      .select("rating, branches!inner(tenant_id)")
      .eq("branches.tenant_id", tenantId),
    supabase
      .from("customer_feedback")
      .select("id, branches!inner(tenant_id)", { count: "exact", head: true })
      .is("response", null)
      .eq("branches.tenant_id", tenantId),
  ]);

  if (customersResult.error) throw safeDbError(customersResult.error, "db");
  if (activeCustomersResult.error) throw safeDbError(activeCustomersResult.error, "db");
  if (vouchersResult.error) throw safeDbError(vouchersResult.error, "db");
  if (activeVouchersResult.error) throw safeDbError(activeVouchersResult.error, "db");
  if (feedbackResult.error) throw safeDbError(feedbackResult.error, "db");
  if (pendingFeedbackResult.error) throw safeDbError(pendingFeedbackResult.error, "db");

  const ratings = feedbackResult.data ?? [];
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum: number, r: { rating: number | null }) => sum + (r.rating ?? 0), 0) / ratings.length
    : 0;

  return {
    totalCustomers: customersResult.count ?? 0,
    activeCustomers: activeCustomersResult.count ?? 0,
    totalVouchers: vouchersResult.count ?? 0,
    activeVouchers: activeVouchersResult.count ?? 0,
    avgRating: Math.round(avgRating * 10) / 10,
    totalFeedback: ratings.length,
    pendingFeedback: pendingFeedbackResult.count ?? 0,
  };
}

export const getCrmStats = withServerQuery(_getCrmStats);

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

  if (error) throw safeDbError(error, "db");
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

  if (error) throw safeDbError(error, "db");
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
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/crm");
  return { error: null, success: true };
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
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/crm");
  return { error: null, success: true };
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

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const toggleCustomerActive = withServerAction(_toggleCustomerActive);
