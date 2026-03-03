import type { Metadata } from "next";
import { createSupabaseServer } from "@comtammatu/database";
import { getCustomerOrders } from "../actions";
import { OrderHistory } from "./order-history";

export const metadata: Metadata = {
  title: "Đơn hàng - Com Tấm Mã Tú",
};

export default async function OrdersPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <OrderHistory orders={[]} />;
  }

  let orders: Awaited<ReturnType<typeof getCustomerOrders>> = [];
  try {
    orders = await getCustomerOrders();
  } catch {
    // Customer record may not exist yet — show empty state
  }

  return <OrderHistory orders={orders} />;
}
