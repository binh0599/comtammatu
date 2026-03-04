"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getTableStatusLabel,
    getOrderStatusLabel,
    formatPrice,
} from "@comtammatu/shared";
import { TableOrderSheet } from "./table-order-sheet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveOrder {
    id: number;
    order_number: string;
    status: string;
    total: number;
    item_count: number;
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
    menu_categories: { id: number; name: string; menu_id: number } | null;
    menu_item_variants:
    | {
        id: number;
        name: string;
        price_adjustment: number;
        is_available: boolean;
    }[]
    | null;
}

interface Category {
    id: number;
    name: string;
    menu_id: number;
}

// ---------------------------------------------------------------------------
// Status badge styles for occupied tables
// ---------------------------------------------------------------------------

const orderStatusBg: Record<string, string> = {
    draft: "bg-gray-500",
    confirmed: "bg-blue-500",
    preparing: "bg-orange-500",
    ready: "bg-green-500",
    served: "bg-purple-500",
};

const statusColors: Record<string, string> = {
    available:
        "border-green-500 bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-md",
    occupied:
        "border-red-500 bg-red-50 text-red-700 hover:bg-red-100 hover:shadow-md",
    reserved:
        "border-yellow-500 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:shadow-md",
    cleaning: "border-gray-400 bg-gray-50 text-gray-600",
};

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
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<"view" | "create" | "list">("create");
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);
    const [selectedActiveOrders, setSelectedActiveOrders] = useState<ActiveOrder[]>([]);
    const [selectedLabel, setSelectedLabel] = useState("");

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

        setSelectedActiveOrders(table.active_orders);

        if (table.active_orders.length > 1) {
            // Multiple active orders → show list so waiter can pick one or create new
            setSheetMode("list");
            setSelectedOrder(null);
        } else if (table.active_orders.length === 1) {
            // Single active order → view it directly
            setSheetMode("view");
            setSelectedOrder(table.active_orders[0]!);
        } else {
            // Available → create order
            setSheetMode("create");
            setSelectedOrder(null);
        }

        setSheetOpen(true);
    }

    function handleTakeawayClick() {
        setSelectedTableId(null);
        setSelectedLabel("Mang về");
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
                            className="flex min-h-[72px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-50 p-3 text-center text-indigo-700 transition-all hover:bg-indigo-100 hover:shadow-md active:scale-95"
                            aria-label="Tạo đơn mang về"
                        >
                            <Package className="mb-1 h-6 w-6" aria-hidden="true" />
                            <span className="text-sm font-bold">Mang về</span>
                        </button>
                    </div>
                </div>

                {/* Tables by zone */}
                {Array.from(zoneMap.entries()).map(([zoneName, zoneTables]) => (
                    <div key={zoneName}>
                        <h3 className="text-muted-foreground mb-3 text-sm font-medium uppercase tracking-wide">
                            {zoneName}
                        </h3>
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                            {zoneTables.map((table) => {
                                const isClickable =
                                    table.status !== "cleaning" &&
                                    table.status !== "reserved";
                                const orders = table.active_orders;
                                const orderCount = orders.length;
                                const firstOrder = orders[0] ?? null;

                                // Build aria label with all active orders
                                const orderLabels = orders
                                    .map((o) => o.order_number)
                                    .join(", ");

                                return (
                                    <button
                                        key={table.id}
                                        type="button"
                                        onClick={() => {
                                            if (isClickable) handleTableClick(table);
                                        }}
                                        disabled={!isClickable}
                                        aria-label={`Bàn ${table.number}, ${getTableStatusLabel(table.status)}${orderLabels ? `, ${orderLabels}` : ""}`}
                                        className={cn(
                                            "relative flex min-h-[72px] flex-col items-center justify-center rounded-lg border-2 p-3 text-center transition-all",
                                            statusColors[table.status] ??
                                            "border-gray-300 bg-gray-50",
                                            isClickable && "cursor-pointer active:scale-95",
                                            !isClickable && "cursor-default opacity-70"
                                        )}
                                    >
                                        <span className="text-lg font-bold">
                                            Bàn {table.number}
                                        </span>
                                        <span className="text-xs">
                                            {getTableStatusLabel(table.status)}
                                        </span>
                                        {table.capacity && (
                                            <span className="mt-0.5 text-xs opacity-60">
                                                {table.capacity} chỗ
                                            </span>
                                        )}

                                        {/* Active order badge(s) */}
                                        {orderCount === 1 && firstOrder && (
                                            <div
                                                className={cn(
                                                    "absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm",
                                                    orderStatusBg[firstOrder.status] ?? "bg-gray-500"
                                                )}
                                                title={`${firstOrder.order_number} · ${getOrderStatusLabel(firstOrder.status)} · ${formatPrice(firstOrder.total)}`}
                                            >
                                                {firstOrder.item_count}
                                            </div>
                                        )}
                                        {orderCount > 1 && (
                                            <div
                                                className="absolute -right-1 -top-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                                                title={orders
                                                    .map(
                                                        (o) =>
                                                            `${o.order_number} · ${getOrderStatusLabel(o.status)} · ${formatPrice(o.total)}`
                                                    )
                                                    .join("\n")}
                                            >
                                                {orderCount} đơn
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {tables.length === 0 && (
                    <div className="text-muted-foreground py-12 text-center">
                        Chưa có bàn nào
                    </div>
                )}
            </div>

            {/* Sheet for viewing / creating orders */}
            <TableOrderSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                mode={sheetMode}
                tableId={selectedTableId}
                tableLabel={selectedLabel}
                activeOrder={selectedOrder}
                activeOrders={selectedActiveOrders}
                menuItems={menuItems}
                categories={categories}
                terminalId={terminalId}
            />
        </>
    );
}
