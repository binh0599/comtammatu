"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  addOrderItemsSchema,
  type OrderStatus,
} from "@comtammatu/shared";
import { isValidTransition, calculateOrderTotals } from "./helpers";

async function getPosProfile() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, branch_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  if (!profile.branch_id) throw new Error("No branch assigned");

  return { supabase, userId: user.id, profile };
}

async function getTaxSettings(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  tenantId: number
) {
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

export async function createOrder(data: {
  table_id?: number | null;
  type: string;
  notes?: string;
  terminal_id: number;
  items: {
    menu_item_id: number;
    variant_id?: number | null;
    quantity: number;
    modifiers?: { name: string; price: number }[];
    notes?: string;
  }[];
}) {
  const { supabase, userId, profile } = await getPosProfile();

  const parsed = createOrderSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const { table_id, type, notes, items } = parsed.data;

  if (items.length === 0) {
    return { error: "Đơn hàng phải có ít nhất 1 món" };
  }

  // Lookup menu item prices
  const itemIds = items.map((i) => i.menu_item_id);
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, base_price, is_available, name")
    .in("id", itemIds);

  if (menuError) return { error: menuError.message };
  if (!menuItems || menuItems.length === 0) {
    return { error: "Không tìm thấy món ăn" };
  }

  // Check availability
  const unavailable = menuItems.filter((mi) => !mi.is_available);
  if (unavailable.length > 0) {
    const names = unavailable.map((mi) => mi.name).join(", ");
    return { error: `Các món sau đã hết: ${names}` };
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
          return { error: "Một số biến thể đã hết hàng" };
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
    profile.tenant_id
  );

  const totals = calculateOrderTotals(orderItems, taxRate, serviceChargeRate);

  // Generate order number
  const { data: orderNum, error: numError } = await supabase.rpc(
    "generate_order_number",
    { p_branch_id: profile.branch_id! }
  );

  if (numError) return { error: `Lỗi tạo mã đơn: ${numError.message}` };

  // Generate idempotency key
  const idempotencyKey = crypto.randomUUID();

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNum as string,
      branch_id: profile.branch_id!,
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
    })
    .select("id, order_number")
    .single();

  if (orderError) return { error: orderError.message };

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

  if (itemsError) return { error: itemsError.message };

  // Update table status to occupied if dine-in
  if (table_id && type === "dine_in") {
    await supabase
      .from("tables")
      .update({ status: "occupied" })
      .eq("id", table_id);
  }

  revalidatePath("/pos/orders");
  revalidatePath("/pos/cashier");

  return {
    error: null,
    orderId: order.id,
    orderNumber: order.order_number,
  };
}

export async function confirmOrder(orderId: number) {
  const { supabase, userId } = await getPosProfile();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return { error: "Đơn hàng không tồn tại" };
  }

  if (!isValidTransition(order.status as OrderStatus, "confirmed")) {
    return { error: `Không thể xác nhận đơn ở trạng thái "${order.status}"` };
  }

  // Update status — KDS ticket creation trigger fires automatically
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "confirmed" })
    .eq("id", orderId);

  if (updateError) return { error: updateError.message };

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${orderId}`);
  revalidatePath("/pos/cashier");

  return { error: null };
}

export async function updateOrderStatus(data: {
  order_id: number;
  status: string;
}) {
  const { supabase } = await getPosProfile();

  const parsed = updateOrderStatusSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const { order_id, status: newStatus } = parsed.data;

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, table_id, type")
    .eq("id", order_id)
    .single();

  if (fetchError || !order) {
    return { error: "Đơn hàng không tồn tại" };
  }

  if (
    !isValidTransition(
      order.status as OrderStatus,
      newStatus as OrderStatus
    )
  ) {
    return {
      error: `Không thể chuyển từ "${order.status}" sang "${newStatus}"`,
    };
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", order_id);

  if (updateError) return { error: updateError.message };

  // Free up table when order is completed or cancelled
  if (
    (newStatus === "completed" || newStatus === "cancelled") &&
    order.table_id &&
    order.type === "dine_in"
  ) {
    await supabase
      .from("tables")
      .update({ status: "available" })
      .eq("id", order.table_id);
  }

  revalidatePath("/pos/orders");
  revalidatePath(`/pos/order/${order_id}`);
  revalidatePath("/pos/cashier");

  return { error: null };
}

export async function getOrders(filters?: {
  status?: string;
  type?: string;
}) {
  const { supabase, profile } = await getPosProfile();

  let query = supabase
    .from("orders")
    .select(
      "*, tables(number, zone_id, branch_zones(name)), order_items(id, menu_item_id, quantity, unit_price, item_total, status, menu_items(name))"
    )
    .eq("branch_id", profile.branch_id!)
    .order("created_at", { ascending: false })
    .limit(50);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getOrderDetail(orderId: number) {
  const { supabase } = await getPosProfile();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `*,
      tables(number, zone_id, branch_zones(name)),
      order_items(*, menu_items(name, image_url), menu_item_variants(name)),
      payments(*),
      order_status_history(*)
    `
    )
    .eq("id", orderId)
    .single();

  if (error) throw new Error(error.message);
  return order;
}

export async function addOrderItems(data: {
  order_id: number;
  items: {
    menu_item_id: number;
    variant_id?: number | null;
    quantity: number;
    modifiers?: { name: string; price: number }[];
    notes?: string;
  }[];
}) {
  const { supabase, profile } = await getPosProfile();

  const parsed = addOrderItemsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const { order_id, items } = parsed.data;

  // Verify order exists and is in draft/confirmed status
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, branch_id")
    .eq("id", order_id)
    .single();

  if (orderError || !order) {
    return { error: "Đơn hàng không tồn tại" };
  }

  if (order.status !== "draft" && order.status !== "confirmed") {
    return { error: "Chỉ có thể thêm món khi đơn ở trạng thái nháp hoặc đã xác nhận" };
  }

  // Lookup prices
  const itemIds = items.map((i) => i.menu_item_id);
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, base_price, is_available")
    .in("id", itemIds);

  if (!menuItems) return { error: "Không tìm thấy món ăn" };

  const priceMap = new Map<number, number>();
  for (const mi of menuItems) {
    if (!mi.is_available) return { error: "Một số món đã hết" };
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
      .select("id, price_adjustment")
      .in("id", variantIds);

    if (variants) {
      for (const v of variants) {
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

  if (insertError) return { error: insertError.message };

  // Recalculate order totals
  const { data: allItems } = await supabase
    .from("order_items")
    .select("unit_price, quantity")
    .eq("order_id", order_id);

  if (allItems) {
    const { taxRate, serviceChargeRate } = await getTaxSettings(
      supabase,
      profile.tenant_id
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

/**
 * Get tables for the user's branch (for waiter UI)
 */
export async function getTables() {
  const { supabase, profile } = await getPosProfile();

  const { data, error } = await supabase
    .from("tables")
    .select("*, branch_zones(name)")
    .eq("branch_id", profile.branch_id!)
    .order("number");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get menu items for the user's branch (for waiter UI)
 */
export async function getMenuItems() {
  const { supabase, profile } = await getPosProfile();

  const { data, error } = await supabase
    .from("menu_items")
    .select(
      "*, menu_categories(id, name, menu_id), menu_item_variants(id, name, price_adjustment, is_available)"
    )
    .eq("tenant_id", profile.tenant_id)
    .eq("is_available", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get categories for filtering
 */
export async function getMenuCategories() {
  const { supabase, profile } = await getPosProfile();

  const { data, error } = await supabase
    .from("menu_categories")
    .select("id, name, menu_id")
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data ?? [];
}
