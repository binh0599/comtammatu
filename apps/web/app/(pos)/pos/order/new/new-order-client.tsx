"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Minus, Plus } from "lucide-react";
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
// GuestCountStep — inline guest count selector for dine-in
// ---------------------------------------------------------------------------

function GuestCountStep({
  tableCapacity,
  onConfirm,
}: {
  tableCapacity: number;
  onConfirm: (count: number) => void;
}) {
  const maxGuests = tableCapacity;
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (count > maxGuests) setCount(maxGuests > 0 ? maxGuests : 1);
  }, [maxGuests, count]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden="true" />
          <h3 className="text-lg font-bold">Số khách</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Chọn số khách cho đơn hàng
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            disabled={count <= 1}
            aria-label="Giảm số khách"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center">
            <span className="text-4xl font-bold">{count}</span>
            <span className="text-muted-foreground text-xs">khách</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCount((c) => Math.min(maxGuests, c + 1))}
            disabled={count >= maxGuests}
            aria-label="Tăng số khách"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: Math.min(maxGuests, 6) }, (_, i) => i + 1).map((n) => (
            <Button
              key={n}
              variant={count === n ? "default" : "outline"}
              size="sm"
              onClick={() => setCount(n)}
              className="h-9 w-9"
            >
              {n}
            </Button>
          ))}
        </div>

        <Button onClick={() => onConfirm(count)} className="w-full gap-2">
          <Users className="h-4 w-4" aria-hidden="true" />
          Xác nhận {count} khách — Chọn món
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewOrderClient
// ---------------------------------------------------------------------------

export function NewOrderClient({
  menuItems,
  categories,
  terminalId,
  tableId,
  tableCapacity,
}: {
  menuItems: MenuItem[];
  categories: Category[];
  terminalId: number;
  tableId: number | null;
  tableCapacity: number | null;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const isDineIn = tableId !== null;
  const [guestCount, setGuestCount] = useState<number | null>(isDineIn ? null : null);
  const needsGuestCount = isDineIn && guestCount === null;

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
      table_id: tableId,
      type: isDineIn ? "dine_in" : "takeaway",
      terminal_id: terminalId,
      guest_count: guestCount ?? undefined,
      items: cart.map((item) => ({
        menu_item_id: item.menu_item_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        notes: item.notes || undefined,
      })),
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

  // Show guest count selector for dine-in orders before showing menu
  if (needsGuestCount) {
    return (
      <div className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/pos">
            <Button variant="ghost" size="icon" aria-label="Quay lại sơ đồ bàn">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Tạo đơn — Tại bàn</h1>
            <p className="text-muted-foreground text-sm">Chọn số khách trước khi gọi món</p>
          </div>
        </div>
        <GuestCountStep
          tableCapacity={tableCapacity ?? 4}
          onConfirm={(count) => setGuestCount(count)}
        />
      </div>
    );
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
            {isDineIn ? "Tạo đơn — Tại bàn" : "Tạo đơn — Mang đi"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Chọn món để thêm vào đơn
            {guestCount != null && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Users className="h-3 w-3" />
                {guestCount} khách
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Menu */}
      <MenuSelector
        menuItems={menuItems}
        categories={categories}
        cart={cart}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
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
