import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { getCustomerOrders } from "../actions";
import { OrderHistory } from "./order-history";

export default async function OrdersPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let orders: Awaited<ReturnType<typeof getCustomerOrders>> = [];
  try {
    orders = await getCustomerOrders();
  } catch {
    // Customer record may not exist yet — show empty state
  }

  return <OrderHistory orders={orders} />;
}
