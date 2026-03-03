"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
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
  const { supabase, tenantId } = await getActionContext();

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

  const { supabase, tenantId, userId } = await getActionContext();

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
  const { supabase, tenantId } = await getActionContext();

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
  items: { po_item_id: number; received_qty: number }[];
}) {
  const parsed = receivePurchaseOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, tenantId, userId } = await getActionContext();

  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("status, branch_id")
    .eq("id", parsed.data.po_id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!po) return { error: "Đơn mua hàng không tồn tại" };

  const validNextStatuses = VALID_PO_TRANSITIONS[po.status as PoStatus];
  if (!validNextStatuses || !validNextStatuses.includes("received")) {
    return { error: `Không thể nhận hàng ở trạng thái "${po.status}"` };
  }

  for (const item of parsed.data.items) {
    const { error: itemError } = await supabase
      .from("purchase_order_items")
      .update({ received_qty: item.received_qty })
      .eq("id", item.po_item_id)
      .eq("po_id", parsed.data.po_id);

    if (itemError) return { error: itemError.message };
  }

  const { error: poError } = await supabase
    .from("purchase_orders")
    .update({ status: "received", received_at: new Date().toISOString() })
    .eq("id", parsed.data.po_id)
    .eq("tenant_id", tenantId);

  if (poError) return { error: poError.message };

  const poItemIds = parsed.data.items.map((i) => i.po_item_id);
  const { data: poItems, error: poItemsError } = await supabase
    .from("purchase_order_items")
    .select("id, ingredient_id")
    .eq("po_id", parsed.data.po_id)
    .in("id", poItemIds);

  if (poItemsError) return { error: poItemsError.message };

  const ingredientMap = new Map(
    (poItems ?? []).map((pi: { id: number; ingredient_id: number }) => [pi.id, pi.ingredient_id])
  );

  for (const item of parsed.data.items) {
    if (item.received_qty <= 0) continue;

    const ingredientId = ingredientMap.get(item.po_item_id);
    if (!ingredientId) continue;

    await supabase.from("stock_movements").insert({
      ingredient_id: ingredientId,
      branch_id: po.branch_id,
      type: "in",
      quantity: item.received_qty,
      notes: `Nhận hàng từ đơn mua #${parsed.data.po_id}`,
      created_by: userId,
    });

    const { data: existing } = await supabase
      .from("stock_levels")
      .select("id, quantity, version")
      .eq("ingredient_id", ingredientId)
      .eq("branch_id", po.branch_id)
      .single();

    if (existing) {
      const newQty = existing.quantity + item.received_qty;
      await supabase
        .from("stock_levels")
        .update({ quantity: newQty, version: existing.version + 1 })
        .eq("id", existing.id)
        .eq("version", existing.version);
    } else {
      await supabase.from("stock_levels").insert({
        ingredient_id: ingredientId,
        branch_id: po.branch_id,
        quantity: item.received_qty,
      });
    }
  }

  revalidatePath("/admin/inventory");
  return { error: null, success: true };
}

export const receivePurchaseOrder = withServerAction(_receivePurchaseOrder);

async function _cancelPurchaseOrder(id: number) {
  const { supabase, tenantId } = await getActionContext();

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
