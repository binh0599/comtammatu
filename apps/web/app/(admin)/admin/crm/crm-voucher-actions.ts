"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  getBranchIdsForTenant,
  withServerAction,
  withServerQuery,
  createVoucherSchema,
  entityIdSchema,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

async function _getVouchers() {
  const { supabase, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("vouchers")
    .select("*, voucher_branches(branch_id, branches(name))")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
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
    // Validate branch_ids belong to this tenant
    const tenantBranchIds = await getBranchIdsForTenant(supabase, tenantId);
    const invalidBranches = parsed.data.branch_ids.filter((id) => !tenantBranchIds.includes(id));
    if (invalidBranches.length > 0) {
      await supabase.from("vouchers").delete().eq("id", voucher.id);
      return { error: "Chi nhánh không hợp lệ hoặc không thuộc đơn vị của bạn" };
    }

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
  return { error: null, success: true };
}

export const createVoucher = withServerAction(_createVoucher);

async function _updateVoucher(
  id: number, data: {
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
  entityIdSchema.parse(id);
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
    // Verify voucher belongs to this tenant before modifying voucher_branches
    const { data: owned } = await supabase
      .from("vouchers")
      .select("id")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();
    if (!owned) return { error: "Voucher không tồn tại hoặc không thuộc đơn vị của bạn" };

    await supabase.from("voucher_branches").delete().eq("voucher_id", id);

    if (branch_ids.length > 0) {
      // Validate branch_ids belong to this tenant
      const tenantBranchIds = await getBranchIdsForTenant(supabase, tenantId);
      const invalidBranches = branch_ids.filter((bid) => !tenantBranchIds.includes(bid));
      if (invalidBranches.length > 0) {
        return { error: "Chi nhánh không hợp lệ hoặc không thuộc đơn vị của bạn" };
      }

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
  return { error: null, success: true };
}

export const updateVoucher = withServerAction(_updateVoucher);

async function _deleteVoucher(id: number) {
  entityIdSchema.parse(id);
  const { supabase, tenantId } = await getActionContext();

  // Verify voucher belongs to this tenant before deleting related data
  const { data: owned } = await supabase
    .from("vouchers")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();
  if (!owned) return { error: "Voucher không tồn tại hoặc không thuộc đơn vị của bạn" };

  await supabase.from("voucher_branches").delete().eq("voucher_id", id);

  const { error } = await supabase
    .from("vouchers")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const deleteVoucher = withServerAction(_deleteVoucher);

async function _toggleVoucher(id: number) {
  entityIdSchema.parse(id);
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

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/crm");
  return { error: null, success: true };
}

export const toggleVoucher = withServerAction(_toggleVoucher);
