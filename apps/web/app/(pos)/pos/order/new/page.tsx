import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import {
  getTables,
  getMenuItems,
  getMenuCategories,
} from "../../orders/actions";
import { NewOrderClient } from "./new-order-client";

export default async function NewOrderPage() {
  // Fetch user's terminal (use first mobile_order terminal in their branch)
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

  // Get a terminal for this user (mobile_order type preferred)
  const { data: terminal } = await supabase
    .from("pos_terminals")
    .select("id")
    .eq("branch_id", profile.branch_id)
    .eq("type", "mobile_order")
    .eq("is_active", true)
    .not("approved_at", "is", null)
    .limit(1)
    .maybeSingle();

  // Fallback to any active terminal
  const terminalId = terminal?.id;

  if (!terminalId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="max-w-sm rounded-lg border bg-yellow-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-yellow-800">
            Chưa có thiết bị
          </h2>
          <p className="text-yellow-700 mt-2 text-sm">
            Không tìm thấy thiết bị gọi món nào được kích hoạt cho chi nhánh
            của bạn. Liên hệ quản lý để thiết lập.
          </p>
        </div>
      </div>
    );
  }

  const [tables, menuItems, categories] = await Promise.all([
    getTables(),
    getMenuItems(),
    getMenuCategories(),
  ]);

  return (
    <NewOrderClient
      tables={tables}
      menuItems={menuItems}
      categories={categories}
      terminalId={terminalId}
    />
  );
}
