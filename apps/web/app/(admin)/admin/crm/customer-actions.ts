"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createCustomerSchema,
  updateCustomerSchema,
  adjustLoyaltyPointsSchema,
  entityIdSchema,
  safeDbError,
  safeDbErrorResult,
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
  entityIdSchema.parse(id);
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
  entityIdSchema.parse(id);
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

async function _getCustomerLoyaltyHistory(customerId: number) {
  entityIdSchema.parse(customerId);
  const { supabase, tenantId } = await getActionContext();

  // Verify customer belongs to this tenant
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("tenant_id", tenantId)
    .single();
  if (!customer) return { error: "Khách hàng không tồn tại hoặc không thuộc đơn vị của bạn" };

  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return safeDbErrorResult(error, "db");
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

  const { supabase, tenantId } = await getActionContext();

  // Verify customer belongs to this tenant
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customer_id)
    .eq("tenant_id", tenantId)
    .single();
  if (!customer) return { error: "Khách hàng không tồn tại hoặc không thuộc đơn vị của bạn" };

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
