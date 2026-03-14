import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { getOrders } from "./actions";
import { OrdersList } from "./orders-list";

export default async function OrdersPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("branch_id")
    .eq("id", user.id)
    .single();

  if (!profile?.branch_id) redirect("/login");

  const orders = await getOrders();

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Đơn hàng</h1>
        <p className="text-muted-foreground text-sm">Danh sách đơn hàng chi nhánh</p>
      </div>
      <OrdersList initialOrders={orders} branchId={profile.branch_id} />
    </div>
  );
}
