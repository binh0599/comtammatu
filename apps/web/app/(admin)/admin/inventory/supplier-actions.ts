"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  getBranchIdsForTenant,
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

// ---------------------------------------------------------------------------
// getSupplierAnalytics — Performance metrics per supplier
// ---------------------------------------------------------------------------

export interface SupplierAnalytic {
  supplier_id: number;
  supplier_name: string;
  total_pos: number;
  total_spent: number;
  avg_delivery_days: number;
  on_time_pct: number;
}

async function _getSupplierAnalytics() {
  const { supabase, tenantId } = await getActionContext();

  // Fetch suppliers for this tenant
  const { data: suppliers, error: suppErr } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("tenant_id", tenantId);

  if (suppErr) throw safeDbError(suppErr, "db");
  if (!suppliers || suppliers.length === 0) return [];

  const supplierIds = suppliers.map((s: { id: number }) => s.id);
  const nameMap = new Map<number, string>(
    suppliers.map((s: { id: number; name: string }) => [s.id, s.name])
  );

  // Fetch all purchase orders for these suppliers
  const { data: pos, error: poErr } = await supabase
    .from("purchase_orders")
    .select("id, supplier_id, total, status, ordered_at, expected_at, received_at")
    .in("supplier_id", supplierIds);

  if (poErr) throw safeDbError(poErr, "db");
  if (!pos || pos.length === 0) {
    return suppliers.map((s: { id: number; name: string }) => ({
      supplier_id: s.id,
      supplier_name: s.name,
      total_pos: 0,
      total_spent: 0,
      avg_delivery_days: 0,
      on_time_pct: 100,
    }));
  }

  // Aggregate per supplier
  const agg = new Map<
    number,
    { count: number; spent: number; deliveryDays: number[]; onTimeCount: number; receivedCount: number }
  >();

  for (const s of suppliers) {
    agg.set(s.id, { count: 0, spent: 0, deliveryDays: [], onTimeCount: 0, receivedCount: 0 });
  }

  for (const po of pos) {
    const entry = agg.get(po.supplier_id);
    if (!entry) continue;

    entry.count++;
    entry.spent += Number(po.total ?? 0);

    if (po.received_at && po.ordered_at) {
      const ordered = new Date(po.ordered_at).getTime();
      const received = new Date(po.received_at).getTime();
      const days = (received - ordered) / (1000 * 60 * 60 * 24);
      if (days >= 0 && days < 365) {
        entry.deliveryDays.push(days);
        entry.receivedCount++;

        if (po.expected_at) {
          const expected = new Date(po.expected_at).getTime();
          if (received <= expected) {
            entry.onTimeCount++;
          }
        } else {
          // No expected date — assume on time
          entry.onTimeCount++;
        }
      }
    }
  }

  const results: SupplierAnalytic[] = [];
  for (const [suppId, data] of agg) {
    const avgDays =
      data.deliveryDays.length > 0
        ? data.deliveryDays.reduce((a, b) => a + b, 0) / data.deliveryDays.length
        : 0;

    results.push({
      supplier_id: suppId,
      supplier_name: nameMap.get(suppId) ?? "",
      total_pos: data.count,
      total_spent: Math.round(data.spent),
      avg_delivery_days: Math.round(avgDays * 10) / 10,
      on_time_pct:
        data.receivedCount > 0
          ? Math.round((data.onTimeCount / data.receivedCount) * 100)
          : 100,
    });
  }

  return results.sort((a, b) => b.total_spent - a.total_spent);
}

export const getSupplierAnalytics = withServerQuery(_getSupplierAnalytics);

// ---------------------------------------------------------------------------
// getReorderSuggestions — Items below min_stock
// ---------------------------------------------------------------------------

export interface ReorderSuggestion {
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  branch_id: number;
  branch_name: string;
  current_qty: number;
  min_stock: number;
  max_stock: number;
  suggested_qty: number;
}

async function _getReorderSuggestions() {
  const { supabase, tenantId } = await getActionContext();
  const branchIds = await getBranchIdsForTenant(supabase, tenantId);
  if (branchIds.length === 0) return [];

  const { data: levels, error: levErr } = await supabase
    .from("stock_levels")
    .select(
      "ingredient_id, branch_id, quantity, ingredients!inner(name, unit, min_stock, max_stock, tenant_id), branches!inner(name)"
    )
    .eq("ingredients.tenant_id", tenantId)
    .in("branch_id", branchIds);

  if (levErr) throw safeDbError(levErr, "db");
  if (!levels || levels.length === 0) return [];

  const suggestions: ReorderSuggestion[] = [];

  for (const row of levels) {
    const ing = row.ingredients as {
      name: string;
      unit: string;
      min_stock: number | null;
      max_stock: number | null;
    };
    const branch = row.branches as { name: string };
    const minStock = ing.min_stock ?? 0;
    const maxStock = ing.max_stock ?? 0;

    if (minStock > 0 && row.quantity <= minStock) {
      const suggestedQty = maxStock > row.quantity
        ? maxStock - row.quantity
        : minStock * 2 - row.quantity;

      suggestions.push({
        ingredient_id: row.ingredient_id,
        ingredient_name: ing.name,
        unit: ing.unit,
        branch_id: row.branch_id,
        branch_name: branch.name,
        current_qty: row.quantity,
        min_stock: minStock,
        max_stock: maxStock,
        suggested_qty: Math.max(suggestedQty, 1),
      });
    }
  }

  return suggestions.sort((a, b) => {
    // Sort by urgency (current/min ratio)
    const ratioA = a.min_stock > 0 ? a.current_qty / a.min_stock : 1;
    const ratioB = b.min_stock > 0 ? b.current_qty / b.min_stock : 1;
    return ratioA - ratioB;
  });
}

export const getReorderSuggestions = withServerQuery(_getReorderSuggestions);
