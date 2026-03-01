"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableGrid } from "./table-selector";
import { MenuSelector, type CartItem } from "./menu-selector";
import { OrderCart } from "./order-cart";
import { createOrder, confirmOrder } from "../../orders/actions";

interface TableItem {
  id: number;
  number: number;
  capacity: number | null;
  status: string;
  zone_id: number;
  branch_zones: { name: string } | null;
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

export function NewOrderClient({
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
  const router = useRouter();
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState("table");

  const handleAddItem = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (c) =>
          c.menu_item_id === item.menu_item_id &&
          c.variant_id === item.variant_id
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx]!,
          quantity: updated[existingIdx]!.quantity + 1,
        };
        return updated;
      }

      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const handleRemoveItem = useCallback(
    (menuItemId: number, variantId: number | null) => {
      setCart((prev) => {
        const existingIdx = prev.findIndex(
          (c) =>
            c.menu_item_id === menuItemId && c.variant_id === variantId
        );

        if (existingIdx < 0) return prev;

        const existing = prev[existingIdx]!;
        if (existing.quantity <= 1) {
          return prev.filter((_, i) => i !== existingIdx);
        }

        const updated = [...prev];
        updated[existingIdx] = {
          ...existing,
          quantity: existing.quantity - 1,
        };
        return updated;
      });
    },
    []
  );

  const handleClearCart = useCallback(() => {
    setCart([]);
  }, []);

  async function handleSubmit() {
    if (cart.length === 0) {
      toast.error("Giỏ hàng trống");
      return;
    }

    const result = await createOrder({
      table_id: selectedTableId,
      type: selectedTableId ? "dine_in" : "takeaway",
      terminal_id: terminalId,
      items: cart.map((item) => ({
        menu_item_id: item.menu_item_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        notes: item.notes || undefined,
      })),
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    // Auto-confirm the order to send to kitchen
    if (result.orderId) {
      const confirmResult = await confirmOrder(result.orderId);
      if (confirmResult.error) {
        toast.error(
          `Đơn tạo thành công nhưng chưa gửi bếp: ${confirmResult.error}`
        );
        router.push(`/pos/order/${result.orderId}`);
        return;
      }
    }

    toast.success(`Đơn ${result.orderNumber} đã gửi bếp`);
    router.push("/pos/orders");
  }

  return (
    <div className="p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="table" className="flex-1">
            1. Chọn bàn
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex-1">
            2. Chọn món
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <TableGrid
            tables={tables}
            selectedId={selectedTableId}
            onSelect={(id) => {
              setSelectedTableId(
                selectedTableId === id ? null : id
              );
            }}
          />
          <div className="mt-4 flex gap-2">
            <p className="text-muted-foreground flex-1 text-sm">
              {selectedTableId
                ? `Bàn ${tables.find((t) => t.id === selectedTableId)?.number ?? ""} đã chọn`
                : "Bỏ qua để tạo đơn mang đi"}
            </p>
            <button
              type="button"
              className="text-primary text-sm font-medium underline"
              onClick={() => setActiveTab("menu")}
            >
              Tiếp tục →
            </button>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="mt-4">
          <MenuSelector
            menuItems={menuItems}
            categories={categories}
            cart={cart}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
          />
        </TabsContent>
      </Tabs>

      <OrderCart
        cart={cart}
        tableId={selectedTableId}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
