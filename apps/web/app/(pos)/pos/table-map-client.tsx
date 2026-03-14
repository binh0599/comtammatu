"use client";

import { useState } from "react";
import { Package } from "lucide-react";

import { TableOrderSheet } from "./table-order-sheet";
import { VisualTable } from "./visual-table";
import { useMenuCache, useTableCache } from "@/hooks/use-data-cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveOrder {
  id: number;
  order_number: string;
  status: string;
  total: number;
  item_count: number;
  guest_count?: number;
  sub_order_index?: number;
}

interface TableItem {
  id: number;
  number: number;
  capacity: number | null;
  status: string;
  zone_id: number;
  branch_zones: { name: string } | null;
  active_orders: ActiveOrder[];
}

interface MenuItem {
  id: number;
  name: string;
  base_price: number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  category_id: number;
  menu_categories: { id: number; name: string; menu_id: number; type: string } | null;
  menu_item_variants:
    | {
        id: number;
        name: string;
        price_adjustment: number;
        is_available: boolean;
      }[]
    | null;
  available_side_ids: number[];
}

interface Category {
  id: number;
  name: string;
  menu_id: number;
  type: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TableMapClient({
  tables,
  menuItems,
  categories,
  terminalId,
}: {
  tables: TableItem[];
  menuItems: MenuItem[];
  categories: Category[];
  terminalId: number;
}) {
  useMenuCache(menuItems, categories);
  useTableCache(tables);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"view" | "create" | "list">("create");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);
  const [selectedActiveOrders, setSelectedActiveOrders] = useState<ActiveOrder[]>([]);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [selectedCapacity, setSelectedCapacity] = useState<number>(4);

  // Group by zone
  const zoneMap = new Map<string, TableItem[]>();
  for (const table of tables) {
    const zoneName = table.branch_zones?.name ?? "Khu vực chung";
    const existing = zoneMap.get(zoneName) ?? [];
    existing.push(table);
    zoneMap.set(zoneName, existing);
  }

  function handleTableClick(table: TableItem) {
    const label = `Bàn ${table.number}`;
    setSelectedTableId(table.id);
    setSelectedLabel(label);
    setSelectedCapacity(table.capacity ?? 4);

    // Assign sub_order_index to orders for display
    const ordersWithIndex = table.active_orders.map((o, i) => ({
      ...o,
      sub_order_index: i + 1,
    }));
    setSelectedActiveOrders(ordersWithIndex);

    if (ordersWithIndex.length > 1) {
      // Multiple active orders → show list so waiter can pick one or create new
      setSheetMode("list");
      setSelectedOrder(null);
    } else if (ordersWithIndex.length === 1) {
      // Single active order → view it directly
      setSheetMode("view");
      setSelectedOrder(ordersWithIndex[0]!);
    } else {
      // Available → create order
      setSheetMode("create");
      setSelectedOrder(null);
    }

    setSheetOpen(true);
  }

  function handleTakeawayClick() {
    setSelectedTableId(null);
    setSelectedLabel("Mang đi");
    setSelectedCapacity(0);
    setSheetMode("create");
    setSelectedOrder(null);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="space-y-6">
        {/* Takeaway card */}
        <div>
          <h3 className="text-muted-foreground mb-3 text-sm font-medium uppercase tracking-wide">
            Loại đơn
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            <button
              type="button"
              onClick={handleTakeawayClick}
              className="flex min-h-[72px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50 p-3 text-center text-indigo-700 transition-all hover:bg-indigo-100 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Tạo đơn mang đi"
            >
              <Package className="mb-1 size-6" aria-hidden="true" />
              <span className="text-sm font-bold">Mang đi</span>
            </button>
          </div>
        </div>

        {/* Tables by zone */}
        {Array.from(zoneMap.entries()).map(([zoneName, zoneTables]) => (
          <div key={zoneName}>
            <h3 className="text-muted-foreground mb-3 text-sm font-medium uppercase tracking-wide">
              {zoneName}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {zoneTables.map((table) => {
                const isClickable = table.status !== "cleaning" && table.status !== "reserved";

                return (
                  <VisualTable
                    key={table.id}
                    tableNumber={table.number}
                    capacity={table.capacity ?? 4}
                    status={table.status}
                    activeOrders={table.active_orders}
                    isClickable={isClickable}
                    onClick={() => handleTableClick(table)}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {tables.length === 0 && (
          <div className="text-muted-foreground py-12 text-center">Chưa có bàn nào</div>
        )}
      </div>

      {/* Sheet for viewing / creating orders */}
      <TableOrderSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        tableId={selectedTableId}
        tableLabel={selectedLabel}
        tableCapacity={selectedCapacity}
        activeOrder={selectedOrder}
        activeOrders={selectedActiveOrders}
        menuItems={menuItems}
        categories={categories}
        terminalId={terminalId}
      />
    </>
  );
}
