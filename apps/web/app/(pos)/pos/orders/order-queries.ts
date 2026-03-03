"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  requireBranch,
  withServerQuery,
  safeDbError,
} from "@comtammatu/shared";

// ---------------------------------------------------------------------------
// getOrders
// ---------------------------------------------------------------------------

async function _getOrders(filters?: {
  status?: string;
  type?: string;
}) {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase } = ctx;

  let query = supabase
    .from("orders")
    .select(
      "*, tables(number, zone_id, branch_zones(name)), order_items(id, menu_item_id, quantity, unit_price, item_total, status, menu_items(name))"
    )
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }

  const { data, error } = await query;

  if (error) {
    throw safeDbError(error, "db");
  }
  return data ?? [];
}

export const getOrders = withServerQuery(_getOrders);

// ---------------------------------------------------------------------------
// getOrderDetail
// ---------------------------------------------------------------------------

async function _getOrderDetail(orderId: number) {
  const ctx = await getActionContext();
  requireBranch(ctx);
  const { supabase } = ctx;

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

  if (error) {
    throw safeDbError(error, "db");
  }
  return order;
}

export const getOrderDetail = withServerQuery(_getOrderDetail);

// ---------------------------------------------------------------------------
// getTables
// ---------------------------------------------------------------------------

async function _getTables() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("tables")
    .select("*, branch_zones(name)")
    .eq("branch_id", branchId)
    .order("number");

  if (error) {
    throw safeDbError(error, "db");
  }
  return data ?? [];
}

export const getTables = withServerQuery(_getTables);

// ---------------------------------------------------------------------------
// getTablesWithActiveOrders
// ---------------------------------------------------------------------------

async function _getTablesWithActiveOrders() {
  const ctx = await getActionContext();
  const branchId = requireBranch(ctx);
  const { supabase } = ctx;

  // 1. Fetch all tables
  const { data: tables, error: tablesError } = await supabase
    .from("tables")
    .select("*, branch_zones(name)")
    .eq("branch_id", branchId)
    .order("number");

  if (tablesError) throw safeDbError(tablesError, "db");
  if (!tables || tables.length === 0) return [];

  // 2. Fetch active orders for this branch (not completed/cancelled)
  const activeStatuses = ["draft", "confirmed", "preparing", "ready", "served"];
  const { data: activeOrders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total, table_id, order_items(id, quantity)"
    )
    .eq("branch_id", branchId)
    .in("status", activeStatuses)
    .not("table_id", "is", null);

  if (ordersError) throw safeDbError(ordersError, "db");

  // 3. Map orders by table_id
  const orderByTable = new Map<
    number,
    {
      id: number;
      order_number: string;
      status: string;
      total: number;
      item_count: number;
    }
  >();

  if (activeOrders) {
    for (const order of activeOrders) {
      if (order.table_id) {
        const itemCount = Array.isArray(order.order_items)
          ? order.order_items.reduce(
            (sum: number, i: { quantity: number }) => sum + i.quantity,
            0
          )
          : 0;
        orderByTable.set(order.table_id, {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total: order.total,
          item_count: itemCount,
        });
      }
    }
  }

  // 4. Merge
  return tables.map((table: { id: number;[key: string]: unknown }) => ({
    ...table,
    active_order: orderByTable.get(table.id) ?? null,
  }));
}

export const getTablesWithActiveOrders = withServerQuery(
  _getTablesWithActiveOrders
);

// ---------------------------------------------------------------------------
// getMenuItems
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _getMenuItems() {
  const ctx = await getActionContext();
  requireBranch(ctx);
  const { supabase, tenantId } = ctx;

  const { data: menuItems, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, name, base_price, category_id, is_available, image_url")
    .eq("tenant_id", tenantId)
    .eq("is_available", true)
    .order("name");

  if (itemsError) throw safeDbError(itemsError, "db");
  if (!menuItems || menuItems.length === 0) return [];

  const categoryIds = [...new Set(menuItems.map((item: any) => item.category_id as number))];
  const itemIds = menuItems.map((item: any) => item.id as number);

  const { batchFetch } = await import("@comtammatu/database");

  const categoryMap = await batchFetch<any>(
    supabase as any,
    "menu_categories",
    categoryIds as (string | number)[],
    "id, name, menu_id"
  );

  const variantsMap = new Map<number, any[]>();
  if (itemIds.length > 0) {
    const { data: variants } = await supabase
      .from("menu_item_variants")
      .select("id, menu_item_id, name, price_adjustment, is_available")
      .in("menu_item_id", itemIds);

    if (variants) {
      for (const variant of variants) {
        if (!variantsMap.has(variant.menu_item_id)) {
          variantsMap.set(variant.menu_item_id, []);
        }
        variantsMap.get(variant.menu_item_id)!.push(variant);
      }
    }
  }

  for (const item of menuItems) {
    (item as any).menu_categories = categoryMap.get(item.category_id) ?? null;
    (item as any).menu_item_variants = variantsMap.get(item.id) ?? [];
  }

  return menuItems;
}

export const getMenuItems = withServerQuery(_getMenuItems);

// ---------------------------------------------------------------------------
// getMenuCategories
// ---------------------------------------------------------------------------

async function _getMenuCategories() {
  const ctx = await getActionContext();
  requireBranch(ctx);
  const { supabase } = ctx;

  const { data, error } = await supabase
    .from("menu_categories")
    .select("id, name, menu_id")
    .order("sort_order");

  if (error) {
    throw safeDbError(error, "db");
  }
  return data ?? [];
}

export const getMenuCategories = withServerQuery(_getMenuCategories);
