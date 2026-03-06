"use server";

import "@/lib/server-bootstrap";
import {
  getAdminContext,
  ADMIN_ROLES,
  withServerAction,
  withServerQuery,
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
  VALID_PO_TRANSITIONS,
  type PoStatus,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

async function _getPurchaseOrders() {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, suppliers(name), branches(name), purchase_order_items(*, ingredients(name, unit))")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw safeDbError(error, "db");
  return data ?? [];
}

export const getPurchaseOrders = withServerQuery(_getPurchaseOrders);

async function _createPurchaseOrder(input: {
  supplier_id: number;
  branch_id: number;
  expected_at?: string;
  notes?: string;
  items: { ingredient_id: number; quantity: number; unit_price: number }[];
}) {
  const parsed = createPurchaseOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  const total = parsed.data.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      tenant_id: tenantId,
      supplier_id: parsed.data.supplier_id,
      branch_id: parsed.data.branch_id,
      created_by: userId,
      status: "draft",
      total: Math.round(total * 100) / 100,
      expected_at: parsed.data.expected_at || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (poError) return { error: poError.message };

  const itemRows = parsed.data.items.map((item) => ({
    po_id: po.id,
    ingredient_id: item.ingredient_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    received_qty: 0,
  }));

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(itemRows);

  if (itemsError) {
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    return { error: itemsError.message };
  }

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const createPurchaseOrder = withServerAction(_createPurchaseOrder);

async function _sendPurchaseOrder(id: number) {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!po) return { error: "Đơn mua hàng không tồn tại" };

  const validNextStatuses = VALID_PO_TRANSITIONS[po.status as PoStatus];
  if (!validNextStatuses || !validNextStatuses.includes("sent")) {
    return { error: `Không thể gửi đơn ở trạng thái "${po.status}"` };
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "sent", ordered_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const sendPurchaseOrder = withServerAction(_sendPurchaseOrder);

async function _receivePurchaseOrder(input: {
  po_id: number;
  items: {
    po_item_id: number;
    ordered_qty: number;
    received_qty: number;
    reject_qty?: number;
    reject_reason?: string;
    quality_status?: string;
    expiry_date?: string;
  }[];
}) {
  const parsed = receivePurchaseOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getAdminContext(ADMIN_ROLES);

  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status, branch_id")
    .eq("id", parsed.data.po_id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!po) return { error: "Đơn mua hàng không tồn tại" };

  const currentStatus = po.status as PoStatus;
  const validNextStatuses = VALID_PO_TRANSITIONS[currentStatus];
  if (
    !validNextStatuses ||
    (!validNextStatuses.includes("received") &&
      !validNextStatuses.includes("partially_received" as PoStatus))
  ) {
    return { error: `Không thể nhận hàng ở trạng thái "${po.status}"` };
  }

  // Fetch existing PO items to compute deltas (prevents double-counting on re-receive)
  const poItemIds = parsed.data.items.map((i) => i.po_item_id);
  const { data: existingPoItems, error: existingErr } = await supabase
    .from("purchase_order_items")
    .select("id, ingredient_id, received_qty, reject_qty")
    .eq("po_id", parsed.data.po_id)
    .in("id", poItemIds);

  if (existingErr) return { error: existingErr.message };

  type ExistingPoItem = { id: number; ingredient_id: number; received_qty: number; reject_qty: number };
  const existingMap = new Map<number, ExistingPoItem>(
    (existingPoItems ?? []).map((pi: ExistingPoItem) => [pi.id, pi])
  );

  // Determine if this is a full or partial receive
  let hasRejected = false;
  let hasAccepted = false;
  for (const item of parsed.data.items) {
    if (item.received_qty > 0) hasAccepted = true;
    if ((item.reject_qty ?? 0) > 0 || item.quality_status === "rejected") hasRejected = true;
  }
  const newPoStatus = hasRejected && hasAccepted ? "partially_received" : "received";

  // Update each PO item with quality check data
  for (const item of parsed.data.items) {
    const updateData: Record<string, unknown> = {
      received_qty: item.received_qty,
      reject_qty: item.reject_qty ?? 0,
      quality_status: item.quality_status ?? "accepted",
      reject_reason: item.reject_reason ?? null,
    };

    const { error: itemError } = await supabase
      .from("purchase_order_items")
      .update(updateData)
      .eq("id", item.po_item_id)
      .eq("po_id", parsed.data.po_id);

    if (itemError) return { error: itemError.message };
  }

  // Process stock updates using deltas
  for (const item of parsed.data.items) {
    const existing = existingMap.get(item.po_item_id);
    if (!existing) continue;

    const ingredientId = existing.ingredient_id;
    const previousReceived = Number(existing.received_qty) || 0;
    const delta = item.received_qty - previousReceived;

    // Skip stock operations if no new quantity received
    if (delta <= 0) continue;

    // Create stock movement for the delta only
    const { error: movError } = await supabase.from("stock_movements").insert({
      ingredient_id: ingredientId,
      branch_id: po.branch_id,
      type: "in",
      quantity: delta,
      notes: `Nhận hàng từ đơn mua #${parsed.data.po_id}${
        (item.reject_qty ?? 0) > 0
          ? ` (từ chối ${item.reject_qty}: ${item.reject_reason || "không đạt"})`
          : ""
      }`,
      created_by: userId,
    });

    if (movError) {
      return { error: `Lỗi tạo phiếu nhập (nguyên liệu #${ingredientId}, PO #${parsed.data.po_id}): ${movError.message}` };
    }

    // Create stock batch for expiry tracking (only for new receives)
    if (item.expiry_date) {
      const { error: batchError } = await supabase.from("stock_batches").insert({
        ingredient_id: ingredientId,
        branch_id: po.branch_id,
        quantity: delta,
        expiry_date: item.expiry_date,
        po_id: parsed.data.po_id,
      });

      if (batchError) {
        return { error: `Lỗi tạo lô hàng (nguyên liệu #${ingredientId}, PO #${parsed.data.po_id}): ${batchError.message}` };
      }
    }

    // Update stock levels with optimistic locking + retry (delta-based)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: existingStock, error: selectErr } = await supabase
        .from("stock_levels")
        .select("id, quantity, version")
        .eq("ingredient_id", ingredientId)
        .eq("branch_id", po.branch_id)
        .single();

      if (selectErr) {
        if (selectErr.code !== "PGRST116") {
          // Real DB error — not just "no rows"
          return safeDbErrorResult(selectErr, "db");
        }
        // No stock_levels row — insert new one
        const { error: insertErr } = await supabase.from("stock_levels").insert({
          ingredient_id: ingredientId,
          branch_id: po.branch_id,
          quantity: delta,
        });
        if (insertErr) return safeDbErrorResult(insertErr, "db");
        break;
      }

      if (!existingStock) {
        const { error: insertErr } = await supabase.from("stock_levels").insert({
          ingredient_id: ingredientId,
          branch_id: po.branch_id,
          quantity: delta,
        });
        if (insertErr) return safeDbErrorResult(insertErr, "db");
        break;
      }

      const newQty = existingStock.quantity + delta;
      const { data: updated, error: updateErr } = await supabase
        .from("stock_levels")
        .update({ quantity: newQty, version: existingStock.version + 1 })
        .eq("id", existingStock.id)
        .eq("version", existingStock.version)
        .select("id");

      if (updateErr) return { error: updateErr.message };
      if (updated && updated.length > 0) break;
      if (attempt === 2) {
        return { error: `Xung đột cập nhật tồn kho nguyên liệu #${ingredientId}` };
      }
    }
  }

  // Update PO status AFTER all stock operations succeed
  const { error: poError } = await supabase
    .from("purchase_orders")
    .update({
      status: newPoStatus,
      received_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.po_id)
    .eq("tenant_id", tenantId);

  if (poError) return { error: poError.message };

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const receivePurchaseOrder = withServerAction(_receivePurchaseOrder);

async function _cancelPurchaseOrder(id: number) {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!po) return { error: "Đơn mua hàng không tồn tại" };

  const validNextStatuses = VALID_PO_TRANSITIONS[po.status as PoStatus];
  if (!validNextStatuses || !validNextStatuses.includes("cancelled")) {
    return { error: `Không thể huỷ đơn ở trạng thái "${po.status}"` };
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return safeDbErrorResult(error, "db");

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const cancelPurchaseOrder = withServerAction(_cancelPurchaseOrder);
