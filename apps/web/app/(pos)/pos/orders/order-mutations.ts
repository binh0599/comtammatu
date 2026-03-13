"use server";

import "@/lib/server-bootstrap";
import { revalidatePath } from "next/cache";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  addOrderItemsSchema,
  removeOrderItemSchema,
  updateOrderItemSchema,
  transferOrderTableSchema,
  updateGuestCountSchema,
  updateOrderNotesSchema,
  type OrderStatus,
  ActionError,
  getActionContext,
  requireBranch,
  withServerAction,
  safeDbError,
} from "@comtammatu/shared";
import { orderLimiter } from "@comtammatu/security";
import {
  isValidTransition,
  calculateOrderTotals,
  maybeReleaseTable,
} from "./helpers";
import { sendPushToBranchRole } from "@/lib/push-sender";

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
  idempotency_key?: string;
  items: {
    menu_item_id: number;
    variant_id?: number | null;
    quantity: number;
    modifiers?: { name: string; price: number }[];
    notes?: string;
    side_items?: {
      menu_item_id: number;
      quantity: number;
      notes?: string;
    }[];
  }[];
}) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase, userId, tenantId } = ctx;

  // Rate limit order creation per user
  const { success: rlSuccess } = await orderLimiter.limit(userId);
  if (!rlSuccess) {
    throw new ActionError(
      "Quá nhiều yêu cầu tạo đơn. Vui lòng thử lại sau.",
      "VALIDATION_ERROR",
    );
  }

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

  // Dine-in orders must have a table
  if (type === "dine_in" && !table_id) {
    throw new ActionError(
      "Đơn tại bàn phải chọn bàn",
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

    // capacityCheck is typed as Json from generated Supabase types
    const result = capacityCheck as {
      ok: boolean;
      error?: string;
      capacity?: number;
      occupied?: number;
      remaining?: number;
    } | null;

    if (!result || !result.ok) {
      if (result?.error === "TABLE_NOT_FOUND") {
        throw new ActionError("Bàn không tồn tại hoặc không thuộc chi nhánh", "NOT_FOUND", 404);
      }
      throw new ActionError(
        `Bàn chỉ còn ${result?.remaining ?? 0} chỗ trống (sức chứa ${result?.capacity ?? 0}, đã có ${result?.occupied ?? 0} khách)`,
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
  if (terminal.type !== "mobile_order" && terminal.type !== "cashier_station") {
    throw new ActionError(
      "Chỉ thiết bị POS (gọi món hoặc thu ngân) mới có thể tạo đơn hàng",
      "VALIDATION_ERROR"
    );
  }

  // Collect all menu item IDs (main + side items)
  const allMenuItemIds = new Set<number>();
  for (const item of items) {
    allMenuItemIds.add(item.menu_item_id);
    if (item.side_items) {
      for (const side of item.side_items) {
        allMenuItemIds.add(side.menu_item_id);
      }
    }
  }

  // Lookup menu item prices + category type — scoped to tenant
  const itemIds = Array.from(allMenuItemIds);
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

  // Validate all requested IDs were found
  type MenuItem = { id: number; base_price: number; is_available: boolean; name: string };
  const typedMenuItems = menuItems as MenuItem[];

  if (typedMenuItems.length !== itemIds.length) {
    const foundIds = new Set(typedMenuItems.map((mi) => mi.id));
    const missing = itemIds.filter((id) => !foundIds.has(id));
    throw new ActionError(
      `Các món sau không tồn tại hoặc không thuộc đơn vị: ${missing.join(", ")}`,
      "NOT_FOUND",
      404
    );
  }

  // Check global availability
  const unavailable = typedMenuItems.filter((mi) => !mi.is_available);
  if (unavailable.length > 0) {
    const names = unavailable.map((mi) => mi.name).join(", ");
    throw new ActionError(`Các món sau đã hết: ${names}`, "CONFLICT", 409);
  }

  // Check branch-level availability (86'd items)
  const { data: branchUnavailable } = await supabase
    .from("menu_item_branch_availability")
    .select("menu_item_id")
    .in("menu_item_id", itemIds)
    .eq("branch_id", branchId)
    .eq("is_available", false);

  if (branchUnavailable && branchUnavailable.length > 0) {
    const unavailableIds = new Set(branchUnavailable.map((r: { menu_item_id: number }) => r.menu_item_id));
    const unavailableNames = typedMenuItems
      .filter((mi) => unavailableIds.has(mi.id))
      .map((mi) => mi.name)
      .join(", ");
    throw new ActionError(
      `Các món sau đã hết tại chi nhánh: ${unavailableNames}`,
      "CONFLICT",
      409,
    );
  }

  // Build price map
  const priceMap = new Map<number, number>();
  for (const mi of typedMenuItems) {
    priceMap.set(mi.id, mi.base_price);
  }

  // Validate side items against allowed list (batched query)
  const itemsWithSides = items.filter((i) => i.side_items && i.side_items.length > 0);
  if (itemsWithSides.length > 0) {
    const parentMenuIds = [...new Set(itemsWithSides.map((i) => i.menu_item_id))];
    const { data: allAllowedSides, error: allowedSidesError } = await supabase
      .from("menu_item_available_sides")
      .select("menu_item_id, side_item_id")
      .in("menu_item_id", parentMenuIds);

    if (allowedSidesError) {
      throw safeDbError(allowedSidesError, "db");
    }

    const allowedMap = new Map<number, Set<number>>();
    for (const row of allAllowedSides ?? []) {
      const r = row as { menu_item_id: number; side_item_id: number };
      if (!allowedMap.has(r.menu_item_id)) {
        allowedMap.set(r.menu_item_id, new Set());
      }
      allowedMap.get(r.menu_item_id)!.add(r.side_item_id);
    }

    for (const item of itemsWithSides) {
      const allowed = allowedMap.get(item.menu_item_id) ?? new Set();
      for (const side of item.side_items!) {
        if (!allowed.has(side.menu_item_id)) {
          throw new ActionError(
            `Món kèm ${side.menu_item_id} không được phép cho món ${item.menu_item_id}`,
            "VALIDATION_ERROR"
          );
        }
      }
    }
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
    const basePrice = priceMap.get(item.menu_item_id)!;
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

  // Use client-provided idempotency key (offline sync dedup) or generate one
  const idempotencyKey = parsed.data.idempotency_key ?? crypto.randomUUID();

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
    // Idempotency: if duplicate key, return existing order (offline retry dedup)
    if (orderError.code === "23505" && parsed.data.idempotency_key) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id, order_number")
        .eq("idempotency_key", idempotencyKey)
        .single();

      if (existing) {
        return { error: null, orderId: existing.id, orderNumber: existing.order_number };
      }
    }
    throw safeDbError(orderError, "db");
  }

  // Insert main order items
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

  const { data: insertedItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemInserts)
    .select("id, menu_item_id");

  if (itemsError) {
    throw safeDbError(itemsError, "db");
  }

  // Insert side items with parent_item_id
  if (insertedItems) {
    const sideInserts: {
      order_id: number;
      menu_item_id: number;
      variant_id: null;
      quantity: number;
      unit_price: number;
      item_total: number;
      modifiers: null;
      notes: string | null;
      status: "pending";
      parent_item_id: number;
    }[] = [];

    for (let i = 0; i < items.length; i++) {
      const originalItem = items[i]!;
      const insertedItem = insertedItems[i];

      if (originalItem.side_items && originalItem.side_items.length > 0 && insertedItem) {
        for (const side of originalItem.side_items) {
          const sidePrice = priceMap.get(side.menu_item_id)!;
          sideInserts.push({
            order_id: order.id,
            menu_item_id: side.menu_item_id,
            variant_id: null,
            quantity: side.quantity,
            unit_price: sidePrice,
            item_total: sidePrice * side.quantity,
            modifiers: null,
            notes: side.notes ?? null,
            status: "pending",
            parent_item_id: insertedItem.id,
          });
        }
      }
    }

    if (sideInserts.length > 0) {
      const { error: sidesError } = await supabase
        .from("order_items")
        .insert(sideInserts);

      if (sidesError) {
        throw safeDbError(sidesError, "db");
      }

      // Recalculate totals including side items
      const sideSubtotal = sideInserts.reduce((sum, s) => sum + s.item_total, 0);
      const newSubtotal = totals.subtotal + sideSubtotal;
      const newTax = newSubtotal * (taxRate / 100);
      const newServiceCharge = newSubtotal * (serviceChargeRate / 100);
      const newTotal = newSubtotal + newTax + newServiceCharge;

      const { error: updateTotalsError } = await supabase
        .from("orders")
        .update({
          subtotal: newSubtotal,
          tax: newTax,
          service_charge: newServiceCharge,
          total: newTotal,
        })
        .eq("id", order.id);

      if (updateTotalsError) {
        throw safeDbError(updateTotalsError, "db");
      }
    }
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

    // Send push notification to relevant staff (fire-and-forget)
    const pushTargetRoles: Record<string, string[]> = {
      confirmed: ["chef"],
      ready: ["waiter", "cashier"],
      completed: ["owner", "manager"],
    };
    const targetRoles = pushTargetRoles[newStatus];
    if (targetRoles) {
      const pushUrl =
        newStatus === "confirmed" ? "/kds" : `/pos/order/${order_id}`;
      void sendPushToBranchRole(ctx.tenantId, branchId, targetRoles, {
        title: `Đơn ${order.order_number}`,
        body: msg.message,
        url: pushUrl,
        type: "order_status",
      }, "order_status");
    }
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
    side_items?: {
      menu_item_id: number;
      quantity: number;
      notes?: string;
    }[];
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

  // Collect all menu item IDs (main + side items)
  const allMenuItemIds = new Set<number>();
  for (const item of items) {
    allMenuItemIds.add(item.menu_item_id);
    if (item.side_items) {
      for (const side of item.side_items) {
        allMenuItemIds.add(side.menu_item_id);
      }
    }
  }

  // Lookup prices + category type — scoped to tenant
  const itemIds = Array.from(allMenuItemIds);
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

  // Validate all requested IDs were found (prevents price defaulting to 0)
  type AddMenuItem = { id: number; base_price: number; is_available: boolean; name: string };
  const typedMenuItems = menuItems as AddMenuItem[];

  if (typedMenuItems.length !== itemIds.length) {
    const foundIds = new Set(typedMenuItems.map((mi) => mi.id));
    const missing = itemIds.filter((id) => !foundIds.has(id));
    throw new ActionError(
      `Các món sau không tồn tại hoặc không thuộc đơn vị: ${missing.join(", ")}`,
      "NOT_FOUND",
      404
    );
  }

  const priceMap = new Map<number, number>();
  for (const mi of typedMenuItems) {
    if (!mi.is_available) {
      throw new ActionError("Một số món đã hết", "CONFLICT", 409);
    }
    priceMap.set(mi.id, mi.base_price);
  }

  // Check branch-level availability (86'd items)
  const { data: branchUnavailableItems } = await supabase
    .from("menu_item_branch_availability")
    .select("menu_item_id")
    .in("menu_item_id", itemIds)
    .eq("branch_id", order.branch_id)
    .eq("is_available", false);

  if (branchUnavailableItems && branchUnavailableItems.length > 0) {
    throw new ActionError(
      "Một số món đã hết tại chi nhánh",
      "CONFLICT",
      409,
    );
  }

  // Validate side items against allowed list (batched query)
  const itemsWithSides = items.filter((i) => i.side_items && i.side_items.length > 0);
  if (itemsWithSides.length > 0) {
    const parentMenuIds = [...new Set(itemsWithSides.map((i) => i.menu_item_id))];
    const { data: allAllowedSides, error: allowedSidesError } = await supabase
      .from("menu_item_available_sides")
      .select("menu_item_id, side_item_id")
      .in("menu_item_id", parentMenuIds);

    if (allowedSidesError) {
      throw safeDbError(allowedSidesError, "db");
    }

    const allowedMap = new Map<number, Set<number>>();
    for (const row of allAllowedSides ?? []) {
      const r = row as { menu_item_id: number; side_item_id: number };
      if (!allowedMap.has(r.menu_item_id)) {
        allowedMap.set(r.menu_item_id, new Set());
      }
      allowedMap.get(r.menu_item_id)!.add(r.side_item_id);
    }

    for (const item of itemsWithSides) {
      const allowed = allowedMap.get(item.menu_item_id) ?? new Set();
      for (const side of item.side_items!) {
        if (!allowed.has(side.menu_item_id)) {
          throw new ActionError(
            `Món kèm ${side.menu_item_id} không được phép cho món ${item.menu_item_id}`,
            "VALIDATION_ERROR"
          );
        }
      }
    }
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

  // Build main items
  const newItems = items.map((item) => {
    const basePrice = priceMap.get(item.menu_item_id)!;
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

  const { data: insertedItems, error: insertError } = await supabase
    .from("order_items")
    .insert(newItems)
    .select("id, menu_item_id");

  if (insertError) {
    throw safeDbError(insertError, "db");
  }

  // Insert side items with parent_item_id
  if (insertedItems) {
    const sideInserts: {
      order_id: number;
      menu_item_id: number;
      variant_id: null;
      quantity: number;
      unit_price: number;
      item_total: number;
      modifiers: null;
      notes: string | null;
      status: "pending";
      parent_item_id: number;
    }[] = [];

    for (let i = 0; i < items.length; i++) {
      const originalItem = items[i]!;
      const insertedItem = insertedItems[i];

      if (originalItem.side_items && originalItem.side_items.length > 0 && insertedItem) {
        for (const side of originalItem.side_items) {
          const sidePrice = priceMap.get(side.menu_item_id)!;
          sideInserts.push({
            order_id,
            menu_item_id: side.menu_item_id,
            variant_id: null,
            quantity: side.quantity,
            unit_price: sidePrice,
            item_total: sidePrice * side.quantity,
            modifiers: null,
            notes: side.notes ?? null,
            status: "pending",
            parent_item_id: insertedItem.id,
          });
        }
      }
    }

    if (sideInserts.length > 0) {
      const { error: sidesError } = await supabase
        .from("order_items")
        .insert(sideInserts);

      if (sidesError) {
        throw safeDbError(sidesError, "db");
      }
    }
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

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        subtotal: totals.subtotal,
        tax: totals.tax,
        service_charge: totals.serviceCharge,
        total: totals.total,
      })
      .eq("id", order_id);

    if (updateError) {
      throw safeDbError(updateError, "db");
    }
  }

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${order_id}`);

  return { error: null };
}

export const addOrderItems = withServerAction(_addOrderItems);

// ---------------------------------------------------------------------------
// removeOrderItem
// ---------------------------------------------------------------------------

async function _removeOrderItem(data: {
  order_id: number;
  item_id: number;
}) {
  const parsed = removeOrderItemSchema.safeParse(data);
  if (!parsed.success) {
    throw new ActionError(
      parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR",
      400
    );
  }

  const { order_id, item_id } = parsed.data;
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase } = ctx;
  const tenantId = ctx.tenantId;

  // Fetch order + verify branch ownership
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, branch_id, table_id")
    .eq("id", order_id)
    .eq("branch_id", branchId)
    .single();

  if (orderError || !order) {
    throw new ActionError(
      "Đơn hàng không tồn tại hoặc không thuộc chi nhánh của bạn",
      "NOT_FOUND",
      404
    );
  }

  // Only allow removal on draft/confirmed orders
  if (!["draft", "confirmed"].includes(order.status)) {
    throw new ActionError(
      "Chỉ có thể xoá món ở đơn nháp hoặc đã xác nhận",
      "VALIDATION_ERROR",
      400
    );
  }

  // Fetch the item — must be pending (not yet sent to KDS)
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("id, status, parent_item_id")
    .eq("id", item_id)
    .eq("order_id", order_id)
    .single();

  if (itemError || !item) {
    throw new ActionError("Món không tồn tại trong đơn hàng", "NOT_FOUND", 404);
  }

  if (item.status !== "pending") {
    throw new ActionError(
      "Không thể xoá món đã gửi đến bếp",
      "VALIDATION_ERROR",
      400
    );
  }

  // Don't allow removing a side item directly — remove via parent
  if (item.parent_item_id) {
    throw new ActionError(
      "Không thể xoá món phụ trực tiếp. Hãy xoá món chính.",
      "VALIDATION_ERROR",
      400
    );
  }

  // Delete child side items first
  const { error: sideDeleteError } = await supabase
    .from("order_items")
    .delete()
    .eq("parent_item_id", item_id)
    .eq("order_id", order_id);

  if (sideDeleteError) {
    throw safeDbError(sideDeleteError, "db");
  }

  // Delete the item itself
  const { error: deleteError } = await supabase
    .from("order_items")
    .delete()
    .eq("id", item_id)
    .eq("order_id", order_id);

  if (deleteError) {
    throw safeDbError(deleteError, "db");
  }

  // Check if this was the last item — if so, cancel the order
  const { count: remainingCount } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order_id)
    .is("parent_item_id", null);

  if (!remainingCount || remainingCount === 0) {
    // No items left — cancel the order
    const { error: cancelError } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order_id);

    if (cancelError) {
      throw safeDbError(cancelError, "db");
    }

    // Release table if applicable
    if (order.table_id) {
      await maybeReleaseTable(supabase, order.table_id, branchId, order_id);
    }

    revalidatePath("/pos/orders");
    revalidatePath(`/pos/order/${order_id}`);
    return { error: null, cancelled: true };
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

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        subtotal: totals.subtotal,
        tax: totals.tax,
        service_charge: totals.serviceCharge,
        total: totals.total,
      })
      .eq("id", order_id);

    if (updateError) {
      throw safeDbError(updateError, "db");
    }
  }

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${order_id}`);

  return { error: null, cancelled: false };
}

export const removeOrderItem = withServerAction(_removeOrderItem);

// ---------------------------------------------------------------------------
// updateOrderItem (quantity)
// ---------------------------------------------------------------------------

async function _updateOrderItem(data: {
  order_id: number;
  item_id: number;
  quantity: number;
}) {
  const parsed = updateOrderItemSchema.safeParse(data);
  if (!parsed.success) {
    throw new ActionError(
      parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR",
      400
    );
  }

  const { order_id, item_id, quantity } = parsed.data;
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase } = ctx;
  const tenantId = ctx.tenantId;

  // Fetch order + verify branch ownership
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, branch_id")
    .eq("id", order_id)
    .eq("branch_id", branchId)
    .single();

  if (orderError || !order) {
    throw new ActionError(
      "Đơn hàng không tồn tại hoặc không thuộc chi nhánh của bạn",
      "NOT_FOUND",
      404
    );
  }

  // Only allow update on draft/confirmed orders
  if (!["draft", "confirmed"].includes(order.status)) {
    throw new ActionError(
      "Chỉ có thể cập nhật số lượng ở đơn nháp hoặc đã xác nhận",
      "VALIDATION_ERROR",
      400
    );
  }

  // Fetch the item — must be pending
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("id, status, unit_price, parent_item_id")
    .eq("id", item_id)
    .eq("order_id", order_id)
    .single();

  if (itemError || !item) {
    throw new ActionError("Món không tồn tại trong đơn hàng", "NOT_FOUND", 404);
  }

  if (item.status !== "pending") {
    throw new ActionError(
      "Không thể cập nhật món đã gửi đến bếp",
      "VALIDATION_ERROR",
      400
    );
  }

  // Update item quantity and recalculate item_total
  const newItemTotal = item.unit_price * quantity;

  const { error: updateItemError } = await supabase
    .from("order_items")
    .update({
      quantity,
      item_total: newItemTotal,
    })
    .eq("id", item_id)
    .eq("order_id", order_id);

  if (updateItemError) {
    throw safeDbError(updateItemError, "db");
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

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        subtotal: totals.subtotal,
        tax: totals.tax,
        service_charge: totals.serviceCharge,
        total: totals.total,
      })
      .eq("id", order_id);

    if (updateError) {
      throw safeDbError(updateError, "db");
    }
  }

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${order_id}`);

  return { error: null };
}

export const updateOrderItem = withServerAction(_updateOrderItem);

// ---------------------------------------------------------------------------
// transferOrderTable
// ---------------------------------------------------------------------------

async function _transferOrderTable(data: {
  order_id: number;
  new_table_id: number;
}) {
  const parsed = transferOrderTableSchema.safeParse(data);
  if (!parsed.success) {
    throw new ActionError(
      parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR",
      400
    );
  }

  const { order_id, new_table_id } = parsed.data;
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase } = ctx;

  // Fetch order + verify branch
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, branch_id, table_id, guest_count")
    .eq("id", order_id)
    .eq("branch_id", branchId)
    .single();

  if (orderError || !order) {
    throw new ActionError(
      "Đơn hàng không tồn tại hoặc không thuộc chi nhánh của bạn",
      "NOT_FOUND",
      404
    );
  }

  // Only active orders can be transferred
  const activeStatuses = ["draft", "confirmed", "preparing", "ready", "served"];
  if (!activeStatuses.includes(order.status)) {
    throw new ActionError(
      "Không thể chuyển bàn cho đơn đã hoàn tất hoặc đã huỷ",
      "VALIDATION_ERROR",
      400
    );
  }

  if (order.table_id === new_table_id) {
    throw new ActionError("Đơn đã ở bàn này", "VALIDATION_ERROR", 400);
  }

  // Validate new table belongs to same branch and has capacity
  if (order.guest_count != null) {
    const { data: capacityCheck } = await supabase.rpc(
      "validate_table_capacity",
      {
        p_table_id: new_table_id,
        p_branch_id: branchId,
        p_guest_count: order.guest_count,
      },
    );

    const result = capacityCheck as {
      ok: boolean;
      error?: string;
      capacity?: number;
      remaining?: number;
    } | null;

    if (!result || !result.ok) {
      if (result?.error === "TABLE_NOT_FOUND") {
        throw new ActionError("Bàn mới không tồn tại hoặc không thuộc chi nhánh", "NOT_FOUND", 404);
      }
      throw new ActionError(
        `Bàn mới chỉ còn ${result?.remaining ?? 0} chỗ trống`,
        "VALIDATION_ERROR",
      );
    }
  } else {
    // Just check table exists in branch
    const { data: newTable } = await supabase
      .from("tables")
      .select("id")
      .eq("id", new_table_id)
      .eq("branch_id", branchId)
      .single();

    if (!newTable) {
      throw new ActionError("Bàn mới không tồn tại hoặc không thuộc chi nhánh", "NOT_FOUND", 404);
    }
  }

  const oldTableId = order.table_id;

  // Update order to new table
  const { error: updateError } = await supabase
    .from("orders")
    .update({ table_id: new_table_id })
    .eq("id", order_id);

  if (updateError) {
    throw safeDbError(updateError, "db");
  }

  // Mark new table as occupied
  await supabase
    .from("tables")
    .update({ status: "occupied" })
    .eq("id", new_table_id)
    .eq("branch_id", branchId);

  // Release old table if no other active orders
  if (oldTableId) {
    await maybeReleaseTable(supabase, oldTableId, branchId, order_id);
  }

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${order_id}`);

  return { error: null };
}

export const transferOrderTable = withServerAction(_transferOrderTable);

// ---------------------------------------------------------------------------
// updateGuestCount
// ---------------------------------------------------------------------------

async function _updateGuestCount(data: {
  order_id: number;
  guest_count: number;
}) {
  const parsed = updateGuestCountSchema.safeParse(data);
  if (!parsed.success) {
    throw new ActionError(
      parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR",
      400
    );
  }

  const { order_id, guest_count } = parsed.data;
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase } = ctx;

  // Fetch order + verify branch
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, branch_id, table_id")
    .eq("id", order_id)
    .eq("branch_id", branchId)
    .single();

  if (orderError || !order) {
    throw new ActionError(
      "Đơn hàng không tồn tại hoặc không thuộc chi nhánh của bạn",
      "NOT_FOUND",
      404
    );
  }

  // Only active orders
  const activeStatuses = ["draft", "confirmed", "preparing", "ready", "served"];
  if (!activeStatuses.includes(order.status)) {
    throw new ActionError(
      "Không thể cập nhật số khách cho đơn đã hoàn tất hoặc đã huỷ",
      "VALIDATION_ERROR",
      400
    );
  }

  // Validate capacity if table assigned
  if (order.table_id) {
    const { data: capacityCheck } = await supabase.rpc(
      "validate_table_capacity",
      {
        p_table_id: order.table_id,
        p_branch_id: branchId,
        p_guest_count: guest_count,
      },
    );

    const result = capacityCheck as {
      ok: boolean;
      remaining?: number;
    } | null;

    if (!result || !result.ok) {
      throw new ActionError(
        `Bàn không đủ chỗ cho ${guest_count} khách`,
        "VALIDATION_ERROR",
      );
    }
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ guest_count })
    .eq("id", order_id);

  if (updateError) {
    throw safeDbError(updateError, "db");
  }

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${order_id}`);

  return { error: null };
}

export const updateGuestCount = withServerAction(_updateGuestCount);

// ---------------------------------------------------------------------------
// updateOrderNotes
// ---------------------------------------------------------------------------

async function _updateOrderNotes(data: {
  order_id: number;
  notes?: string | null;
}) {
  const parsed = updateOrderNotesSchema.safeParse(data);
  if (!parsed.success) {
    throw new ActionError(
      parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR",
      400
    );
  }

  const { order_id, notes } = parsed.data;
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase } = ctx;

  // Fetch order + verify branch
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, branch_id")
    .eq("id", order_id)
    .eq("branch_id", branchId)
    .single();

  if (orderError || !order) {
    throw new ActionError(
      "Đơn hàng không tồn tại hoặc không thuộc chi nhánh của bạn",
      "NOT_FOUND",
      404
    );
  }

  // Only active orders
  const activeStatuses = ["draft", "confirmed", "preparing", "ready", "served"];
  if (!activeStatuses.includes(order.status)) {
    throw new ActionError(
      "Không thể cập nhật ghi chú cho đơn đã hoàn tất hoặc đã huỷ",
      "VALIDATION_ERROR",
      400
    );
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ notes: notes ?? null })
    .eq("id", order_id);

  if (updateError) {
    throw safeDbError(updateError, "db");
  }

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${order_id}`);

  return { error: null };
}

export const updateOrderNotes = withServerAction(_updateOrderNotes);
