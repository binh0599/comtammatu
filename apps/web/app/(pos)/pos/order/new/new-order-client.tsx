"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MenuSelector, type CartItem } from "./menu-selector";
import { OrderCart } from "./order-cart";
import { createOrder, confirmOrder } from "../../orders/actions";
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

export function NewOrderClient({
  menuItems,
  categories,
  terminalId,
  tableId,
}: {
  menuItems: MenuItem[];
  categories: Category[];
  terminalId: number;
  tableId: number | null;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);

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

  const handleUpdateItemNotes = useCallback(
    (menuItemId: number, variantId: number | null, notes: string) => {
      setCart((prev) =>
        prev.map((c) =>
          c.menu_item_id === menuItemId && c.variant_id === variantId
            ? { ...c, notes }
            : c
        )
      );
    },
    []
  );

  async function handleSubmit() {
    if (cart.length === 0) {
      toast.error("Giỏ hàng trống");
      return;
    }

    // Build order items: main items + their side items
    const orderItems = cart.map((item) => ({
      menu_item_id: item.menu_item_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      notes: item.notes || undefined,
      side_items: item.side_items.length > 0
        ? item.side_items.map((s) => ({
            menu_item_id: s.menu_item_id,
            quantity: s.quantity,
            notes: s.notes || undefined,
          }))
        : undefined,
    }));

    const result = await createOrder({
      table_id: tableId,
      type: tableId ? "dine_in" : "takeaway",
      terminal_id: terminalId,
      items: orderItems,
    });

    if (result.error !== null) {
      toast.error(result.error);
      return;
    }

    // Auto-confirm the order to send to kitchen
    if (result.orderId) {
      const confirmResult = await confirmOrder(result.orderId);
      if (confirmResult.error !== null) {
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
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/pos">
          <Button variant="ghost" size="icon" aria-label="Quay lại sơ đồ bàn">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {tableId ? "Tạo đơn — Tại bàn" : "Tạo đơn — Mang đi"}
          </h1>
          <p className="text-muted-foreground text-sm">Chọn món để thêm vào đơn</p>
        </div>
      </div>

      {/* Menu */}
      <MenuSelector
        menuItems={menuItems}
        categories={categories}
        cart={cart}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onUpdateItemNotes={handleUpdateItemNotes}
      />

      {/* Cart drawer */}
      <OrderCart
        cart={cart}
        tableId={tableId}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
