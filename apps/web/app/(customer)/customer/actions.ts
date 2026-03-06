"use server";

import "@/lib/server-bootstrap";
import {
  createFeedbackSchema,
  customerPlaceOrderSchema,
  deletionRequestSchema,
  entityIdSchema,
  handleServerActionError,
  getCustomerContext,
  safeDbError,
  withServerAction,
} from "@comtammatu/shared";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Public: Menu browsing (no auth required)
// ---------------------------------------------------------------------------

async function _getPublicMenu() {
  // Public menu — no auth required, use Supabase client directly
  const { createSupabaseServer } = await import("@comtammatu/database");
  const supabase = await createSupabaseServer();

  // Single-tenant: resolve tenant from the first branch
  const { data: branch } = await supabase
    .from("branches")
    .select("tenant_id")
    .limit(1)
    .single();

  if (!branch?.tenant_id) {
    throw new Error("Không tìm thấy thông tin cửa hàng");
  }

  const tenantId = branch.tenant_id;

  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select(
      "id, name, description, base_price, image_url, category_id, allergens, menu_categories(id, name, sort_order, type)",
    )
    .eq("tenant_id", tenantId)
    .eq("is_available", true)
    .order("name");

  if (itemsError) throw safeDbError(itemsError, "db");

  const { data: categories, error: catError } = await supabase
    .from("menu_categories")
    .select("id, name, sort_order, type")
    .order("sort_order");

  if (catError) throw safeDbError(catError, "db");

  return {
    items: items ?? [],
    categories: categories ?? [],
  };
}

export async function getPublicMenu() {
  try {
    return await _getPublicMenu();
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Auth: Place order
// ---------------------------------------------------------------------------

async function _placeCustomerOrder(data: {
  branch_id: number;
  type: "dine_in" | "takeaway";
  table_id?: number;
  items: {
    menu_item_id: number;
    quantity: number;
    variant_id?: number;
    modifiers?: number[];
    notes?: string;
  }[];
  notes?: string;
  voucher_code?: string;
}) {
  const parsed = customerPlaceOrderSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const { supabase, customer } = await getCustomerContext();
  const tenantId = customer.tenant_id;

  // Verify branch belongs to same tenant
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, tenant_id")
    .eq("id", parsed.data.branch_id)
    .single();

  if (branchError || !branch) {
    return { error: "Chi nhánh không tồn tại" };
  }
  if (branch.tenant_id !== tenantId) {
    return { error: "Chi nhánh không thuộc cửa hàng" };
  }

  const branchId = branch.id;

  // Lookup menu items to get prices
  const itemIds = parsed.data.items.map((i) => i.menu_item_id);
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, base_price, is_available, name")
    .in("id", itemIds)
    .eq("tenant_id", tenantId);

  if (menuError) throw safeDbError(menuError, "db");
  if (!menuItems || menuItems.length === 0) {
    return { error: "Không tìm thấy món ăn" };
  }

  // Validate all items found
  type MenuItemRow = {
    id: number;
    base_price: number;
    is_available: boolean;
    name: string;
  };
  const typedMenuItems = menuItems as MenuItemRow[];
  if (typedMenuItems.length !== itemIds.length) {
    return { error: "Một số món ăn không tồn tại" };
  }

  // Check availability
  const unavailable = typedMenuItems.filter((mi) => !mi.is_available);
  if (unavailable.length > 0) {
    const names = unavailable.map((mi) => mi.name).join(", ");
    return { error: `Các món sau đã hết: ${names}` };
  }

  // Build price map
  const priceMap = new Map<number, number>();
  for (const mi of typedMenuItems) {
    priceMap.set(mi.id, mi.base_price);
  }

  // Calculate order items
  const orderItems = parsed.data.items.map((item) => {
    const basePrice = priceMap.get(item.menu_item_id)!;
    return {
      menu_item_id: item.menu_item_id,
      variant_id: item.variant_id ?? null,
      quantity: item.quantity,
      unit_price: basePrice,
      item_total: basePrice * item.quantity,
      modifiers: null,
      notes: item.notes ?? null,
      status: "pending" as const,
    };
  });

  // Get tax settings
  const { data: settings } = await supabase
    .from("system_settings")
    .select("key, value")
    .eq("tenant_id", tenantId)
    .in("key", ["tax_rate", "service_charge"]);

  let taxRate = 10;
  let serviceChargeRate = 5;
  if (settings) {
    for (const s of settings as { key: string; value: string | null }[]) {
      if (s.key === "tax_rate" && s.value !== null) taxRate = Number(s.value);
      if (s.key === "service_charge" && s.value !== null)
        serviceChargeRate = Number(s.value);
    }
  }

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + item.item_total, 0);
  const tax = Math.round(subtotal * (taxRate / 100));
  const serviceCharge = Math.round(subtotal * (serviceChargeRate / 100));
  let discountTotal = 0;

  // Validate voucher if provided
  if (parsed.data.voucher_code) {
    const { data: voucher } = await supabase
      .from("vouchers")
      .select(
        "id, code, type, value, min_order, max_uses, used_count, valid_from, valid_until, is_active",
      )
      .eq("code", parsed.data.voucher_code)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .single();

    if (!voucher) {
      return { error: "Mã giảm giá không hợp lệ" };
    }

    const now = new Date();
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      return { error: "Mã giảm giá chưa có hiệu lực" };
    }
    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      return { error: "Mã giảm giá đã hết hạn" };
    }
    if (
      voucher.max_uses != null &&
      voucher.used_count != null &&
      voucher.used_count >= voucher.max_uses
    ) {
      return { error: "Mã giảm giá đã hết lượt sử dụng" };
    }
    if (voucher.min_order != null && subtotal < voucher.min_order) {
      return {
        error: `Đơn hàng tối thiểu ${voucher.min_order.toLocaleString("vi-VN")}đ để sử dụng mã này`,
      };
    }

    // Calculate discount
    if (voucher.type === "percentage") {
      discountTotal = Math.round(subtotal * (voucher.value / 100));
    } else {
      discountTotal = Math.min(voucher.value, subtotal);
    }
  }

  const total = subtotal + tax + serviceCharge - discountTotal;

  // Generate order number
  const { data: orderNum, error: numError } = await supabase.rpc(
    "generate_order_number",
    { p_branch_id: branchId },
  );

  if (numError) throw safeDbError(numError, "db");

  const idempotencyKey = crypto.randomUUID();

  // Insert order — status 'confirmed' (customer orders skip draft)
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNum as string,
      branch_id: branchId,
      table_id: parsed.data.table_id ?? null,
      type: parsed.data.type,
      status: "confirmed",
      customer_id: customer.id,
      idempotency_key: idempotencyKey,
      subtotal,
      tax,
      service_charge: serviceCharge,
      discount_total: discountTotal,
      total,
      notes: parsed.data.notes ?? null,
    })
    .select("id, order_number")
    .single();

  if (orderError) throw safeDbError(orderError, "db");

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

  if (itemsError) throw safeDbError(itemsError, "db");

  revalidatePath("/customer/orders");

  return {
    error: null,
    orderId: order.id,
    orderNumber: order.order_number,
  };
}

export const placeCustomerOrder = withServerAction(_placeCustomerOrder);

// ---------------------------------------------------------------------------
// Auth: Customer orders
// ---------------------------------------------------------------------------

async function _getCustomerOrders() {
  const { supabase, customer } = await getCustomerContext();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, type, subtotal, tax, service_charge, total, created_at, order_items(id, quantity, unit_price, item_total, menu_items(name))",
    )
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw safeDbError(error, "db");
  return orders ?? [];
}

export async function getCustomerOrders() {
  try {
    return await _getCustomerOrders();
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Auth: Loyalty dashboard
// ---------------------------------------------------------------------------

async function _getCustomerLoyalty() {
  const { supabase, customer } = await getCustomerContext();

  // Get loyalty tier info
  let tierName: string | null = null;
  let tierDiscountPct: number | null = null;
  let tierMinPoints = 0;

  if (customer.loyalty_tier_id) {
    const { data: tier } = await supabase
      .from("loyalty_tiers")
      .select("name, discount_pct, min_points")
      .eq("id", customer.loyalty_tier_id)
      .single();

    if (tier) {
      tierName = tier.name;
      tierDiscountPct = tier.discount_pct;
      tierMinPoints = tier.min_points;
    }
  }

  // Get all tiers for progress calculation
  const { data: allTiers } = await supabase
    .from("loyalty_tiers")
    .select("id, name, min_points, discount_pct")
    .eq("tenant_id", customer.tenant_id)
    .order("min_points");

  // Calculate current points from transactions
  const { data: allTransactions } = await supabase
    .from("loyalty_transactions")
    .select("points")
    .eq("customer_id", customer.id);

  const currentPoints = (allTransactions ?? []).reduce(
    (sum: number, row: { points: number | null }) => sum + (row.points ?? 0),
    0,
  );

  // Get recent 10 transactions
  const { data: transactions } = await supabase
    .from("loyalty_transactions")
    .select("id, type, points, balance_after, reference_type, created_at")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Find next tier
  let nextTier: { name: string; min_points: number } | null = null;
  if (allTiers) {
    const sortedTiers = [...allTiers].sort(
      (a, b) => a.min_points - b.min_points,
    );
    for (const t of sortedTiers) {
      if (t.min_points > currentPoints) {
        nextTier = { name: t.name, min_points: t.min_points };
        break;
      }
    }
  }

  return {
    currentPoints,
    tierName,
    tierDiscountPct,
    tierMinPoints,
    nextTier,
    transactions: transactions ?? [],
    totalSpent: customer.total_spent,
    totalVisits: customer.total_visits,
  };
}

export async function getCustomerLoyalty() {
  try {
    return await _getCustomerLoyalty();
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Auth: Feedback
// ---------------------------------------------------------------------------

async function _getOrderForFeedback(orderId: number) {
  entityIdSchema.parse(orderId);
  const { supabase, customer } = await getCustomerContext();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total, created_at, branch_id, order_items(id, quantity, unit_price, item_total, menu_items(name))",
    )
    .eq("id", orderId)
    .eq("customer_id", customer.id)
    .single();

  if (error || !order) {
    return { error: "Đơn hàng không tồn tại hoặc không thuộc về bạn" };
  }

  // Check if already reviewed
  const { data: existingFeedback } = await supabase
    .from("customer_feedback")
    .select("id")
    .eq("order_id", orderId)
    .eq("customer_id", customer.id)
    .limit(1);

  const alreadyReviewed = (existingFeedback?.length ?? 0) > 0;

  return { order, alreadyReviewed, error: null };
}

export async function getOrderForFeedback(orderId: number) {
  try {
    return await _getOrderForFeedback(orderId);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

async function _submitFeedback(data: {
  order_id: number;
  branch_id: number;
  rating: number;
  comment?: string;
}) {
  const { supabase, customer } = await getCustomerContext();

  const parsed = createFeedbackSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  // Verify order belongs to customer and derive branch_id from server
  const { data: order } = await supabase
    .from("orders")
    .select("id, branch_id")
    .eq("id", parsed.data.order_id ?? 0)
    .eq("customer_id", customer.id)
    .single();

  if (!order) {
    return { error: "Đơn hàng không tồn tại" };
  }

  // Check if already reviewed
  const { data: existing } = await supabase
    .from("customer_feedback")
    .select("id")
    .eq("order_id", parsed.data.order_id ?? 0)
    .eq("customer_id", customer.id)
    .limit(1);

  if ((existing?.length ?? 0) > 0) {
    return { error: "Bạn đã đánh giá đơn hàng này rồi" };
  }

  const { error: insertError } = await supabase
    .from("customer_feedback")
    .insert({
      customer_id: customer.id,
      order_id: parsed.data.order_id ?? null,
      branch_id: order.branch_id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    });

  if (insertError) return { error: insertError.message };

  return { error: null };
}

export async function submitFeedback(data: {
  order_id: number;
  branch_id: number;
  rating: number;
  comment?: string;
}) {
  try {
    return await _submitFeedback(data);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}

// ---------------------------------------------------------------------------
// Auth: Account & Profile
// ---------------------------------------------------------------------------

async function _getCustomerProfile() {
  const { customer } = await getCustomerContext();

  return {
    fullName: customer.full_name,
    phone: customer.phone,
    email: customer.email,
    gender: customer.gender,
    birthday: customer.birthday,
    totalSpent: customer.total_spent,
    totalVisits: customer.total_visits,
    createdAt: customer.created_at,
  };
}

export async function getCustomerProfile() {
  try {
    return await _getCustomerProfile();
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Auth: GDPR — Data Export
// ---------------------------------------------------------------------------

async function _requestDataExport() {
  const { supabase, customer } = await getCustomerContext();

  // Collect all customer data
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, type, total, created_at, order_items(id, quantity, unit_price, menu_items(name))",
    )
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  const { data: loyaltyTransactions } = await supabase
    .from("loyalty_transactions")
    .select("id, type, points, balance_after, created_at")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  const { data: feedback } = await supabase
    .from("customer_feedback")
    .select("id, rating, comment, created_at, response")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  const exportData = {
    exported_at: new Date().toISOString(),
    customer: {
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      gender: customer.gender,
      birthday: customer.birthday,
      total_spent: customer.total_spent,
      total_visits: customer.total_visits,
      created_at: customer.created_at,
    },
    orders: orders ?? [],
    loyalty_transactions: loyaltyTransactions ?? [],
    feedback: feedback ?? [],
  };

  return exportData;
}

export async function requestDataExport() {
  try {
    return await _requestDataExport();
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    const result = handleServerActionError(error);
    throw new Error(result.error, { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Auth: GDPR — Deletion Request
// ---------------------------------------------------------------------------

async function _requestDeletion(reason?: string) {
  const { supabase, customer } = await getCustomerContext();

  const parsed = deletionRequestSchema.safeParse({ reason });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  // Check for existing pending deletion request
  const { data: existing } = await supabase
    .from("deletion_requests")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("status", "pending")
    .limit(1);

  if ((existing?.length ?? 0) > 0) {
    return { error: "Bạn đã có yêu cầu xóa đang chờ xử lý" };
  }

  // Schedule deletion 30 days from now
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 30);

  const { error: insertError } = await supabase
    .from("deletion_requests")
    .insert({
      customer_id: customer.id,
      scheduled_deletion_at: scheduledDate.toISOString(),
      status: "pending",
    });

  if (insertError) return { error: insertError.message };

  return {
    error: null,
    scheduledDate: scheduledDate.toISOString(),
  };
}

export async function requestDeletion(reason?: string) {
  try {
    return await _requestDeletion(reason);
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return handleServerActionError(error);
  }
}
