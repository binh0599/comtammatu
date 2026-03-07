"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@comtammatu/shared";
import { useCart } from "./cart-context";
import { placeCustomerOrder } from "../actions";
import { toast } from "sonner";

interface CartDrawerProps {
  branchId: number | null;
}

export function CartDrawer({ branchId }: CartDrawerProps) {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
  } = useCart();
  const [open, setOpen] = useState(false);
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const [voucherCode, setVoucherCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handlePlaceOrder() {
    if (items.length === 0 || branchId === null) return;

    startTransition(async () => {
      const result = await placeCustomerOrder({
        branch_id: branchId,
        type: orderType,
        items: items.map((item) => ({
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          variant_id: item.variantId,
          modifiers: item.modifiers,
          notes: item.notes,
        })),
        notes: "",
        voucher_code: voucherCode || undefined,
      });

      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      if (result && "orderId" in result && result.orderId) {
        clearCart();
        setOpen(false);
        toast.success("Đặt hàng thành công!");
        router.push(`/customer/orders/${result.orderId}`);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
          aria-label={`Giỏ hàng (${cartCount} món)`}
        >
          <ShoppingCart className="h-6 w-6" />
          {cartCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">
              {cartCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="flex max-h-[85vh] flex-col rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Giỏ hàng ({cartCount} món)</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
            <ShoppingCart className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground text-sm">
              Giỏ hàng trống
            </p>
          </div>
        ) : (
          <>
            {/* Cart items list */}
            <div className="flex-1 space-y-3 overflow-y-auto py-2">
              {items.map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatPrice(item.price)}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        updateQuantity(item.menuItemId, item.quantity - 1)
                      }
                      aria-label={`Giảm số lượng ${item.name}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        updateQuantity(item.menuItemId, item.quantity + 1)
                      }
                      aria-label={`Tăng số lượng ${item.name}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <span className="w-20 text-right text-sm font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeItem(item.menuItemId)}
                    aria-label={`Xóa ${item.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Order type selector */}
            <div className="space-y-2 py-2">
              <Label className="text-sm font-medium">Hình thức</Label>
              <div className="flex gap-2">
                <Button
                  variant={orderType === "dine_in" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setOrderType("dine_in")}
                >
                  Tại quán
                </Button>
                <Button
                  variant={orderType === "takeaway" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setOrderType("takeaway")}
                >
                  Mang đi
                </Button>
              </div>
            </div>

            {/* Voucher input */}
            <div className="space-y-2 py-2">
              <Label htmlFor="voucher-code" className="text-sm font-medium">
                Mã giảm giá (nếu có)
              </Label>
              <Input
                id="voucher-code"
                placeholder="Nhập mã giảm giá..."
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
              />
            </div>

            <Separator />

            {/* Subtotal */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Tạm tính</span>
              <span className="text-lg font-bold">
                {formatPrice(cartTotal)}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Thuế và phí dịch vụ sẽ được tính khi đặt hàng
            </p>

            <SheetFooter className="pt-2">
              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isPending || items.length === 0 || branchId === null}
              >
                {branchId === null ? (
                  "Không thể đặt hàng — chưa có chi nhánh"
                ) : isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đặt hàng...
                  </>
                ) : (
                  "Đặt hàng"
                )}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
