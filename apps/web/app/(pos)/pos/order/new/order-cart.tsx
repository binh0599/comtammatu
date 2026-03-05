"use client";

import { useTransition } from "react";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { formatPrice } from "@comtammatu/shared";
import type { CartItem } from "./menu-selector";

export function OrderCart({
  cart,
  tableId,
  onAddItem,
  onRemoveItem,
  onClearCart,
  onSubmit,
}: {
  cart: CartItem[];
  tableId: number | null;
  onAddItem: (item: CartItem) => void;
  onRemoveItem: (menuItemId: number, variantId: number | null) => void;
  onClearCart: () => void;
  onSubmit: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => {
    let itemTotal = item.unit_price * item.quantity;
    for (const side of item.side_items) {
      itemTotal += side.unit_price * side.quantity;
    }
    return sum + itemTotal;
  }, 0);

  function handleSubmit() {
    startTransition(async () => {
      await onSubmit();
    });
  }

  if (cart.length === 0) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 p-3">
      <Drawer>
        <DrawerTrigger asChild>
          <Button className="w-full gap-2 py-6 text-base shadow-lg">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            <span className="flex-1 text-left">
              {totalItems} món · {formatPrice(subtotal)}
            </span>
            <Badge variant="secondary" className="ml-2">
              Xem giỏ
            </Badge>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>
              Giỏ hàng ({totalItems} món)
              {tableId && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  · Bàn đã chọn
                </span>
              )}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCart}
              className="text-red-500"
              aria-label="Xóa tất cả sản phẩm"
            >
              <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
              Xóa hết
            </Button>
          </DrawerHeader>

          <div className="max-h-[50vh] overflow-y-auto px-4">
            <div className="space-y-3">
              {cart.map((item) => {
                const sidesTotal = item.side_items.reduce(
                  (sum, s) => sum + s.unit_price * s.quantity,
                  0
                );
                const lineTotal =
                  item.unit_price * item.quantity + sidesTotal;

                return (
                  <div
                    key={`${item.menu_item_id}-${item.variant_id ?? "base"}`}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {item.name}
                          {item.variant_name && (
                            <span className="text-muted-foreground text-sm">
                              {" "}
                              ({item.variant_name})
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {formatPrice(item.unit_price)} x {item.quantity} ={" "}
                          {formatPrice(item.unit_price * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-11 w-11"
                          onClick={() =>
                            onRemoveItem(item.menu_item_id, item.variant_id)
                          }
                          aria-label={`Bớt ${item.name}`}
                        >
                          <Minus className="h-3 w-3" aria-hidden="true" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-11 w-11"
                          onClick={() => onAddItem(item)}
                          aria-label={`Thêm ${item.name}`}
                        >
                          <Plus className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    {/* Side items */}
                    {item.side_items.length > 0 && (
                      <div className="mt-2 space-y-1 border-t pt-2">
                        {item.side_items.map((side) => (
                          <div
                            key={side.menu_item_id}
                            className="text-muted-foreground flex justify-between text-sm"
                          >
                            <span>+ {side.name} x{side.quantity}</span>
                            <span>{formatPrice(side.unit_price * side.quantity)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-medium">
                          <span>Tổng dòng</span>
                          <span>{formatPrice(lineTotal)}</span>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <div className="text-muted-foreground mt-1 text-xs italic">
                        Ghi chú: &quot;{item.notes}&quot;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t px-4 py-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Chưa bao gồm thuế và phí dịch vụ
            </p>
          </div>

          <DrawerFooter>
            <Button
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={isPending || cart.length === 0}
            >
              {isPending ? "Đang tạo đơn..." : "Tạo đơn hàng"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Tiếp tục chọn món</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
