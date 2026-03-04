"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  addOrderItemsSchema,
  type OrderStatus,
  ActionError,
  getActionContext,
  requireBranch,
  withServerAction,
  safeDbError,
} from "@comtammatu/shared";
import {
  isValidTransition,
  calculateOrderTotals,
  maybeReleaseTable,
} from "./helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTaxSettings(supabase: any, tenantId: number) {
  const { data: settings } = await supabase
    .from("system_settings")
    .select("key, value")
    .eq("tenant_id", tenantId)
    .in("key", ["tax_rate", "service_charge"]);

  let taxRate = 10; // default 10%
  let serviceChargeRate = 5; // default 5%

  if (settings) {
    for (const s of settings) {
      if (s.key === "tax_rate" && s.value !== null) {
        taxRate = Number(s.value);
      }
      if (s.key === "service_charge" && s.value !== null) {
        serviceChargeRate = Number(s.value);
      }
    }
  }

  return { taxRate, serviceChargeRate };
}

// ---------------------------------------------------------------------------
// createOrder
// ---------------------------------------------------------------------------

async function _createOrder(data: {
  table_id?: number | null;
  type: string;
  notes?: string;
  guest_count?: number | null;
  terminal_id: number;
  items: {
    menu_item_id: number;
    variant_id?: number | null;
    quantity: number;
    modifiers?: { name: string; price: number }[];
    notes?: string;
  }[];
}) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase, userId, tenantId } = ctx;

  const parsed = createOrderSchema.safeParse(data);
  if (!parsed.success) {
    throw new ActionError(
      parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const { table_id, type, notes, guest_count, items } = parsed.data;

  if (items.length === 0) {
    throw new ActionError(
      "Đơn hàng phải có ít nhất 1 món",
      "VALIDATION_ERROR"
    );
  }

  // Validate guest_count against table capacity for dine-in orders
  // Uses row-level locking (FOR UPDATE) to prevent race conditions
  if (type === "dine_in" && table_id && guest_count != null) {
    const { data: capacityCheck, error: capacityError } = await supabase.rpc(
      "validate_table_capacity",
      {
        p_table_id: table_id,
        p_branch_id: branchId,
        p_guest_count: guest_count,
      },
    );

    if (capacityError) {
      throw safeDbError(capacityError, "db");
    }

    const result = capacityCheck as { ok: boolean; error?: string; capacity?: number; occupied?: number; remaining?: number };

    if (!result.ok) {
      if (result.error === "TABLE_NOT_FOUND") {
        throw new ActionError("Bàn không tồn tại hoặc không thuộc chi nhánh", "NOT_FOUND", 404);
      }
      throw new ActionError(
        `Bàn chỉ còn ${result.remaining} chỗ trống (sức chứa ${result.capacity}, đã có ${result.occupied} khách)`,
        "VALIDATION_ERROR",
      );
    }
  }

  // Validate terminal belongs to user's branch and is the correct type
  const { data: terminal, error: terminalError } = await supabase
    .from("pos_terminals")
    .select("id, type, branch_id, is_active, approved_at")
    .eq("id", data.terminal_id)
    .single();

  if (terminalError || !terminal) {
    throw new ActionError("Thiết bị không tồn tại", "NOT_FOUND", 404);
  }
  if (terminal.branch_id !== branchId) {
    throw new ActionError(
      "Thiết bị không thuộc chi nhánh của bạn",
      "UNAUTHORIZED",
      403
    );
  }
  if (!terminal.is_active || !terminal.approved_at) {
    throw new ActionError(
      "Thiết bị chưa được kích hoạt hoặc phê duyệt",
      "VALIDATION_ERROR"
    );
  }
  if (terminal.type !== "mobile_order") {
    throw new ActionError(
      "Chỉ thiết bị đặt món (mobile) mới có thể tạo đơn hàng",
      "VALIDATION_ERROR"
    );
  }

  // Lookup menu item prices — scoped to tenant
  const itemIds = items.map((i) => i.menu_item_id);
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, base_price, is_available, name")
    .in("id", itemIds)
    .eq("tenant_id", tenantId);

  if (menuError) {
    throw safeDbError(menuError, "db");
  }
  if (!menuItems || menuItems.length === 0) {
    throw new ActionError("Không tìm thấy món ăn", "NOT_FOUND", 404);
  }

  // Check availability
  type MenuItem = { id: number; base_price: number; is_available: boolean; name: string };
  const unavailable = (menuItems as MenuItem[]).filter((mi) => !mi.is_available);
  if (unavailable.length > 0) {
    const names = unavailable.map((mi) => mi.name).join(", ");
    throw new ActionError(`Các món sau đã hết: ${names}`, "CONFLICT", 409);
  }

  // Build price map
  const priceMap = new Map<number, number>();
  for (const mi of menuItems) {
    priceMap.set(mi.id, mi.base_price);
  }

  // Lookup variant price adjustments if needed
  const variantIds = items
    .map((i) => i.variant_id)
    .filter((id): id is number => id != null && id > 0);

  const variantPriceMap = new Map<number, number>();
  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from("menu_item_variants")
      .select("id, price_adjustment, is_available")
      .in("id", variantIds);

    if (variants) {
      for (const v of variants) {
        if (!v.is_available) {
          throw new ActionError(
            "Một số biến thể đã hết hàng",
            "CONFLICT",
            409
          );
        }
        variantPriceMap.set(v.id, v.price_adjustment);
      }
    }
  }

  // Calculate line items
  const orderItems = items.map((item) => {
    const basePrice = priceMap.get(item.menu_item_id) ?? 0;
    const variantAdj = item.variant_id
      ? (variantPriceMap.get(item.variant_id) ?? 0)
      : 0;
    const modifierTotal = (item.modifiers ?? []).reduce(
      (sum, m) => sum + m.price,
      0
    );
    const unitPrice = basePrice + variantAdj + modifierTotal;

    return {
      menu_item_id: item.menu_item_id,
      variant_id: item.variant_id ?? null,
      quantity: item.quantity,
      unit_price: unitPrice,
      item_total: unitPrice * item.quantity,
      modifiers: item.modifiers ?? null,
      notes: item.notes ?? null,
      status: "pending" as const,
    };
  });

  // Calculate totals
  const { taxRate, serviceChargeRate } = await getTaxSettings(
    supabase,
    tenantId
  );

  const totals = calculateOrderTotals(orderItems, taxRate, serviceChargeRate);

  // Generate order number
  const { data: orderNum, error: numError } = await supabase.rpc(
    "generate_order_number",
    { p_branch_id: branchId }
  );

  if (numError) {
    throw safeDbError(numError, "db");
  }

  // Generate idempotency key
  const idempotencyKey = crypto.randomUUID();

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNum as string,
      branch_id: branchId,
      table_id: table_id ?? null,
      type,
      status: "draft",
      created_by: userId,
      terminal_id: data.terminal_id,
      idempotency_key: idempotencyKey,
      subtotal: totals.subtotal,
      tax: totals.tax,
      service_charge: totals.serviceCharge,
      discount_total: 0,
      total: totals.total,
      notes: notes ?? null,
      guest_count: guest_count ?? null,
    })
    .select("id, order_number")
    .single();

  if (orderError) {
    throw safeDbError(orderError, "db");
  }

  // Insert order items
  const itemInserts = orderItems.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    variant_id: item.variant_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    item_total: item.item_total,
    modifiers: item.modifiers,
    notes: item.notes,
    status: item.status,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemInserts);

  if (itemsError) {
    throw safeDbError(itemsError, "db");
  }

  // Update table status to occupied if dine-in (scoped to branch)
  if (table_id && type === "dine_in") {
    await supabase
      .from("tables")
      .update({ status: "occupied" })
      .eq("id", table_id)
      .eq("branch_id", branchId);
  }

  revalidatePath("/pos/orders");
  revalidatePath("/pos/cashier");

  return {
    error: null,
    orderId: order.id,
    orderNumber: order.order_number,
  };
}

export const createOrder = withServerAction(_createOrder);

// ---------------------------------------------------------------------------
// confirmOrder
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper — delegates to updateOrderStatus.
 * Kept as a named export for backward compatibility with existing consumers.
 */
export async function confirmOrder(orderId: number) {
  return updateOrderStatus({ order_id: orderId, status: "confirmed" });
}

// ---------------------------------------------------------------------------
// updateOrderStatus
// ---------------------------------------------------------------------------

async function _updateOrderStatus(data: {
  order_id: number;
  status: string;
}) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase } = ctx;

  const parsed = updateOrderStatusSchema.safeParse(data);
  if (!parsed.success) {
    throw new ActionError(
      parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const { order_id, status: newStatus } = parsed.data;

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, table_id, type, order_number")
    .eq("id", order_id)
    .eq("branch_id", branchId)
    .single();

  if (fetchError || !order) {
    throw new ActionError("Đơn hàng không tồn tại", "NOT_FOUND", 404);
  }

  if (
    !isValidTransition(
      order.status as OrderStatus,
      newStatus as OrderStatus
    )
  ) {
    throw new ActionError(
      `Không thể chuyển từ "${order.status}" sang "${newStatus}"`,
      "CONFLICT",
      409
    );
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", order_id);

  if (updateError) {
    throw safeDbError(updateError, "db");
  }

  // Free up table when order is completed or cancelled — but only if no
  // other active orders remain on the same table (multi-order-per-table).
  if (
    (newStatus === "completed" || newStatus === "cancelled") &&
    order.table_id &&
    order.type === "dine_in"
  ) {
    await maybeReleaseTable(supabase, order.table_id, branchId, order_id);
  }

  // Broadcast realtime notification to all POS/KDS clients in this branch
  const statusMessages: Record<string, { type: string; message: string }> = {
    confirmed: { type: "new_order", message: "Đơn mới đã xác nhận" },
    preparing: { type: "info", message: "Bếp đang chuẩn bị" },
    ready: { type: "order_ready", message: "Đơn đã sẵn sàng phục vụ!" },
    served: { type: "info", message: "Đã phục vụ, chờ thanh toán" },
    completed: { type: "info", message: "Thanh toán hoàn tất" },
    cancelled: { type: "order_cancelled", message: "Đơn đã bị hủy" },
  };

  const msg = statusMessages[newStatus];
  if (msg) {
    const channel = supabase.channel(`branch:${branchId}:notifications`);
    await channel.send({
      type: "broadcast",
      event: "notification",
      payload: {
        type: msg.type,
        message: msg.message,
        order_number: order.order_number,
      },
    });
    supabase.removeChannel(channel);
  }

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${order_id}`);
  revalidatePath("/pos/cashier");

  return { error: null };
}

export const updateOrderStatus = withServerAction(_updateOrderStatus);

// ---------------------------------------------------------------------------
// addOrderItems
// ---------------------------------------------------------------------------

async function _addOrderItems(data: {
  order_id: number;
  items: {
    menu_item_id: number;
    variant_id?: number | null;
    quantity: number;
    modifiers?: { name: string; price: number }[];
    notes?: string;
  }[];
}) {
  const ctx = await getActionContext();
  requireBranch(ctx);
  const { supabase, tenantId } = ctx;

  const parsed = addOrderItemsSchema.safeParse(data);
  if (!parsed.success) {
    throw new ActionError(
      parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const { order_id, items } = parsed.data;

  // Verify order exists and is not finalized
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, branch_id")
    .eq("id", order_id)
    .single();

  if (orderError || !order) {
    throw new ActionError("Đơn hàng không tồn tại", "NOT_FOUND", 404);
  }

  const finalStatuses = ["completed", "cancelled"];
  if (finalStatuses.includes(order.status)) {
    throw new ActionError(
      "Không thể thêm món khi đơn đã hoàn thành hoặc đã hủy",
      "CONFLICT",
      409
    );
  }

  // Lookup prices — scoped to tenant
  const itemIds = items.map((i) => i.menu_item_id);
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, base_price, is_available")
    .in("id", itemIds)
    .eq("tenant_id", tenantId);

  if (!menuItems) {
    throw new ActionError("Không tìm thấy món ăn", "NOT_FOUND", 404);
  }

  const priceMap = new Map<number, number>();
  for (const mi of menuItems) {
    if (!mi.is_available) {
      throw new ActionError("Một số món đã hết", "CONFLICT", 409);
    }
    priceMap.set(mi.id, mi.base_price);
  }

  // Lookup variant prices
  const variantIds = items
    .map((i) => i.variant_id)
    .filter((id): id is number => id != null && id > 0);

  const variantPriceMap = new Map<number, number>();
  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from("menu_item_variants")
      .select("id, price_adjustment, is_available, menu_items!inner(tenant_id)")
      .in("id", variantIds)
      .eq("menu_items.tenant_id", tenantId);

    if (variants) {
      for (const v of variants) {
        if (!(v as unknown as { is_available: boolean }).is_available) {
          throw new ActionError("Một số biến thể đã hết hàng", "CONFLICT", 409);
        }
        variantPriceMap.set(v.id, v.price_adjustment);
      }
    }
  }

  // Build items
  const newItems = items.map((item) => {
    const basePrice = priceMap.get(item.menu_item_id) ?? 0;
    const variantAdj = item.variant_id
      ? (variantPriceMap.get(item.variant_id) ?? 0)
      : 0;
    const modifierTotal = (item.modifiers ?? []).reduce(
      (sum, m) => sum + m.price,
      0
    );
    const unitPrice = basePrice + variantAdj + modifierTotal;

    return {
      order_id,
      menu_item_id: item.menu_item_id,
      variant_id: item.variant_id ?? null,
      quantity: item.quantity,
      unit_price: unitPrice,
      item_total: unitPrice * item.quantity,
      modifiers: item.modifiers ?? null,
      notes: item.notes ?? null,
      status: "pending" as const,
    };
  });

  const { error: insertError } = await supabase
    .from("order_items")
    .insert(newItems);

  if (insertError) {
    throw safeDbError(insertError, "db");
  }

  // Recalculate order totals
  const { data: allItems } = await supabase
    .from("order_items")
    .select("unit_price, quantity")
    .eq("order_id", order_id);

  if (allItems) {
    const { taxRate, serviceChargeRate } = await getTaxSettings(
      supabase,
      tenantId
    );
    const totals = calculateOrderTotals(allItems, taxRate, serviceChargeRate);

    await supabase
      .from("orders")
      .update({
        subtotal: totals.subtotal,
        tax: totals.tax,
        service_charge: totals.serviceCharge,
        total: totals.total,
      })
      .eq("id", order_id);
  }

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${order_id}`);

  return { error: null };
}

export const addOrderItems = withServerAction(_addOrderItems);
