"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  createSupplierSchema,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

async function _getSuppliers() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getSuppliers = withServerQuery(_getSuppliers);

async function _createSupplier(formData: FormData) {
  const parsed = createSupplierSchema.safeParse({
    name: formData.get("name"),
    contact_name: formData.get("contact_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    payment_terms: formData.get("payment_terms"),
    rating: formData.get("rating") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase.from("suppliers").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    contact_name: parsed.data.contact_name || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    payment_terms: parsed.data.payment_terms || null,
    rating: parsed.data.rating ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Nhà cung cấp đã tồn tại" };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const createSupplier = withServerAction(_createSupplier);

async function _updateSupplier(id: number, formData: FormData) {
  const parsed = createSupplierSchema.safeParse({
    name: formData.get("name"),
    contact_name: formData.get("contact_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    payment_terms: formData.get("payment_terms"),
    rating: formData.get("rating") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("suppliers")
    .update({
      name: parsed.data.name,
      contact_name: parsed.data.contact_name || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      payment_terms: parsed.data.payment_terms || null,
      rating: parsed.data.rating ?? null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const updateSupplier = withServerAction(_updateSupplier);

async function _deleteSupplier(id: number) {
  const { supabase, tenantId } = await getActionContext();

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    if (error.code === "23503") {
      return { error: "Không thể xóa — nhà cung cấp này đang có đơn mua hàng" };
    }
    return safeDbErrorResult(error, "db");
  }

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const deleteSupplier = withServerAction(_deleteSupplier);
