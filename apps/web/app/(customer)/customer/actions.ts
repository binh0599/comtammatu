"use server";

import "@/lib/server-bootstrap";
import {
  createFeedbackSchema,
  deletionRequestSchema,
  entityIdSchema,
  handleServerActionError,
  getCustomerContext,
  safeDbError,
} from "@comtammatu/shared";

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
      "id, name, description, base_price, image_url, category_id, allergens, menu_categories(id, name, sort_order)",
    )
    .eq("tenant_id", tenantId)
    .eq("is_available", true)
    .order("name");

  if (itemsError) throw safeDbError(itemsError, "db");

  const { data: categories, error: catError } = await supabase
    .from("menu_categories")
    .select("id, name, sort_order")
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
