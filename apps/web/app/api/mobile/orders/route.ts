import type { NextRequest } from "next/server";
import { getMobileCustomer, checkMobileRateLimit, jsonOk, jsonError } from "../helpers";

/**
 * GET /api/mobile/orders
 * Requires authentication.
 * Fetch customer's order history with order items and menu details.
 */
export async function GET(_req: NextRequest) {
  try {
    const result = await getMobileCustomer();
    if ("error" in result) {
      return result.error;
    }

    const { supabase, customer } = result;

    // Rate limit by customer ID
    const rateLimitResponse = await checkMobileRateLimit(`orders:${customer.id}`);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Fetch orders with items and menu details
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        order_type,
        status,
        subtotal,
        tax,
        service_charge,
        total,
        notes,
        created_at,
        updated_at,
        order_items(
          id,
          quantity,
          unit_price,
          total_price,
          notes,
          menu_items(id, name, description)
        )
      `
      )
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching orders:", error);
      return jsonError("Không thể tải lịch sử đơn hàng. Vui lòng thử lại sau.", 500);
    }

    return jsonOk({
      orders: orders ?? [],
    });
  } catch (error) {
    console.error("[GET /api/mobile/orders]", error);
    return jsonError("Lỗi máy chủ. Vui lòng thử lại sau.", 500);
  }
}

/**
 * POST /api/mobile/orders
 * Not implemented yet. Placeholder for future mobile order creation.
 */
export async function POST(_req: NextRequest) {
  return jsonError("Chức năng này chưa được triển khai. Vui lòng liên hệ hỗ trợ.", 501);
}
