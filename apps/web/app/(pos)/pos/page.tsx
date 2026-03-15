import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { getTablesWithActiveOrders, getMenuItems, getMenuCategories } from "./orders/actions";
import { TableMapClient } from "./table-map-client";

export default async function PosPage() {
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

  // Find this user's registered device and its linked terminal
  const { data: device } = await supabase
    .from("registered_devices")
    .select("linked_terminal_id")
    .eq("registered_by", user.id)
    .eq("status", "approved")
    .not("linked_terminal_id", "is", null)
    .limit(1)
    .maybeSingle();

  let terminalId: number | null = null;

  // Validate the linked terminal is still valid for this branch
  // Accept both mobile_order and cashier_station (cashier can also take orders)
  if (device?.linked_terminal_id) {
    const { data: linkedTerminal } = await supabase
      .from("pos_terminals")
      .select("id")
      .eq("id", device.linked_terminal_id)
      .eq("branch_id", profile.branch_id)
      .in("type", ["mobile_order", "cashier_station"])
      .eq("is_active", true)
      .not("approved_at", "is", null)
      .maybeSingle();
    terminalId = linkedTerminal?.id ?? null;
  }

  // Fallback: find any active POS terminal in the branch (mobile_order preferred)
  if (!terminalId) {
    const { data: terminal } = await supabase
      .from("pos_terminals")
      .select("id")
      .eq("branch_id", profile.branch_id)
      .in("type", ["mobile_order", "cashier_station"])
      .eq("is_active", true)
      .not("approved_at", "is", null)
      .order("type") // mobile_order sorts before cashier_station
      .limit(1)
      .maybeSingle();
    terminalId = terminal?.id ?? null;
  }

  if (!terminalId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="max-w-sm rounded-lg border bg-yellow-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-yellow-800">Chưa có thiết bị</h2>
          <p className="text-yellow-700 mt-2 text-sm">
            Không tìm thấy thiết bị gọi món nào được kích hoạt cho chi nhánh của bạn. Liên hệ quản
            lý để thiết lập.
          </p>
        </div>
      </div>
    );
  }

  const [tables, menuItems, categories] = await Promise.all([
    getTablesWithActiveOrders(),
    getMenuItems(),
    getMenuCategories(),
  ]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Sơ đồ bàn</h1>
        <p className="text-muted-foreground text-sm">Chọn bàn để xem đơn hoặc tạo đơn mới</p>
      </div>
      <TableMapClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex joined query result; typed at component boundary
        tables={tables as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex joined query result; typed at component boundary
        menuItems={menuItems as any}
        categories={categories}
        terminalId={terminalId}
      />
    </div>
  );
}
