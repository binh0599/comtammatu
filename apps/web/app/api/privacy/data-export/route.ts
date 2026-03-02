import { NextResponse } from "next/server";
import { getAuthenticatedCustomer } from "../helpers";

/**
 * GET /api/privacy/data-export
 * GDPR/DSAR: Export all customer data as JSON download.
 */
export async function GET() {
  const result = await getAuthenticatedCustomer();

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const { supabase, customer } = result;

  // Collect all customer data in parallel
  const [
    { data: loyaltyTransactions },
    { data: feedback },
    { data: orders },
  ] = await Promise.all([
    supabase
      .from("loyalty_transactions")
      .select("id, type, points, balance_after, reference_type, reference_id, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_feedback")
      .select("id, order_id, branch_id, rating, comment, response, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, order_number, order_type, status, subtotal, tax, service_charge, total, created_at, order_items(id, menu_item_id, quantity, unit_price, total_price, notes)")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    customer: {
      id: customer.id,
      full_name: customer.full_name,
      email: customer.email,
    },
    loyalty_transactions: loyaltyTransactions ?? [],
    feedback: feedback ?? [],
    orders: orders ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-data-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
