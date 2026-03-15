import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { getMenuItems, getMenuCategories } from "../../orders/actions";
import { NewOrderClient } from "./new-order-client";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const { table } = await searchParams;

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

  // Get an active cashier terminal for this branch (payment processing requires cashier_station)
  const { data: terminal } = await supabase
    .from("pos_terminals")
    .select("id")
    .eq("branch_id", profile.branch_id)
    .eq("type", "cashier_station")
    .eq("is_active", true)
    .not("approved_at", "is", null)
    .limit(1)
    .maybeSingle();

  const terminalId = terminal?.id;

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

  const tableId = table ? Number(table) : null;

  // Fetch table capacity for dine-in guest count validation
  let tableCapacity: number | null = null;
  if (tableId) {
    const { data: tableData } = await supabase
      .from("tables")
      .select("capacity")
      .eq("id", tableId)
      .eq("branch_id", profile.branch_id)
      .single();
    tableCapacity = tableData?.capacity ?? null;
  }

  const [menuItems, categories] = await Promise.all([getMenuItems(), getMenuCategories()]);

  return (
    <NewOrderClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex nested select with modifiers/categories; typed at component boundary
      menuItems={menuItems as any}
      categories={categories}
      terminalId={terminalId}
      tableId={tableId}
      tableCapacity={tableCapacity}
    />
  );
}
