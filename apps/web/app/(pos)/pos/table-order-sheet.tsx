"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Send,
    CheckCircle,
    Banknote,
    XCircle,
    ArrowRight,
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    formatPrice,
    getOrderStatusLabel,
} from "@comtammatu/shared";
import { MenuSelector, type CartItem } from "./order/new/menu-selector";
import { OrderCart } from "./order/new/order-cart";
import {
    createOrder,
    confirmOrder,
    updateOrderStatus,
} from "./orders/actions";

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

const statusVariant: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
> = {
    draft: "secondary",
    confirmed: "outline",
    preparing: "outline",
    ready: "default",
    served: "default",
};

// ---------------------------------------------------------------------------
// OrderViewMode – shows active order details
// ---------------------------------------------------------------------------

function OrderViewMode({
    order,
    tableLabel,
    onClose,
}: {
    order: ActiveOrder;
    tableLabel: string;
    onClose: () => void;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleConfirm() {
        startTransition(async () => {
            const result = await confirmOrder(order.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Đã gửi bếp");
                onClose();
                router.refresh();
            }
        });
    }

    function handleStatusUpdate(newStatus: string) {
        startTransition(async () => {
            const result = await updateOrderStatus({
                order_id: order.id,
                status: newStatus,
            });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Đã cập nhật: ${getOrderStatusLabel(newStatus)}`);
                onClose();
                router.refresh();
            }
        });
    }

    return (
        <div className="flex flex-1 flex-col">
            {/* Order summary */}
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-lg font-bold">{order.order_number}</p>
                        <p className="text-muted-foreground text-sm">{tableLabel}</p>
                    </div>
                    <Badge variant={statusVariant[order.status] ?? "secondary"}>
                        {getOrderStatusLabel(order.status)}
                    </Badge>
                </div>

                <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                            {order.item_count} món
                        </span>
                        <span className="text-lg font-bold">
                            {formatPrice(order.total)}
                        </span>
                    </div>
                </div>

                {/* Status guidance */}
                {order.status === "preparing" && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center text-sm text-orange-700">
                        Bếp đang chuẩn bị đơn hàng
                    </div>
                )}
                {order.status === "served" && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center text-sm text-blue-700">
                        Đã phục vụ — chờ thanh toán
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-2 border-t p-4">
                {order.status === "draft" && (
                    <Button
                        onClick={handleConfirm}
                        disabled={isPending}
                        className="w-full gap-2"
                    >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        Gửi bếp
                    </Button>
                )}
                {order.status === "ready" && (
                    <Button
                        onClick={() => handleStatusUpdate("served")}
                        disabled={isPending}
                        className="w-full gap-2"
                    >
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                        Đã phục vụ
                    </Button>
                )}
                {order.status === "served" && (
                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                            onClose();
                            router.push("/pos/cashier");
                        }}
                    >
                        <Banknote className="h-4 w-4" aria-hidden="true" />
                        Chuyển sang thu ngân
                    </Button>
                )}
                {(order.status === "draft" || order.status === "confirmed") && (
                    <Button
                        variant="destructive"
                        onClick={() => handleStatusUpdate("cancelled")}
                        disabled={isPending}
                        className="w-full gap-2"
                    >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Hủy đơn
                    </Button>
                )}

                {/* View detail */}
                <Button
                    variant="ghost"
                    className="w-full gap-2"
                    onClick={() => {
                        onClose();
                        router.push(`/pos/order/${order.id}`);
                    }}
                >
                    Xem chi tiết
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// CreateOrderMode – menu selector for new order
// ---------------------------------------------------------------------------

function CreateOrderMode({
    tableId,
    tableLabel,
    menuItems,
    categories,
    terminalId,
    onClose,
}: {
    tableId: number | null;
    tableLabel: string;
    menuItems: MenuItem[];
    categories: Category[];
    terminalId: number;
    onClose: () => void;
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

    async function handleSubmit() {
        if (cart.length === 0) {
            toast.error("Giỏ hàng trống");
            return;
        }

        const result = await createOrder({
            table_id: tableId,
            type: tableId ? "dine_in" : "takeaway",
            terminal_id: terminalId,
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

        // Auto-confirm
        if (result.orderId) {
            const confirmResult = await confirmOrder(result.orderId);
            if (confirmResult.error !== null) {
                toast.error(
                    `Đơn tạo thành công nhưng chưa gửi bếp: ${confirmResult.error}`
                );
                onClose();
                router.push(`/pos/order/${result.orderId}`);
                return;
            }
        }

        toast.success(`Đơn ${result.orderNumber} đã gửi bếp`);
        onClose();
        router.refresh();
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="p-4 pb-2">
                <p className="text-muted-foreground text-sm">{tableLabel}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-24">
                <MenuSelector
                    menuItems={menuItems}
                    categories={categories}
                    cart={cart}
                    onAddItem={handleAddItem}
                    onRemoveItem={handleRemoveItem}
                />
            </div>
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

// ---------------------------------------------------------------------------
// TableOrderSheet – main export
// ---------------------------------------------------------------------------

export function TableOrderSheet({
    open,
    onOpenChange,
    mode,
    tableId,
    tableLabel,
    activeOrder,
    menuItems,
    categories,
    terminalId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "view" | "create";
    tableId: number | null;
    tableLabel: string;
    activeOrder: ActiveOrder | null;
    menuItems: MenuItem[];
    categories: Category[];
    terminalId: number;
}) {
    const sheetTitle =
        mode === "view" ? `Đơn hàng — ${tableLabel}` : `Tạo đơn — ${tableLabel}`;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="flex h-[85vh] flex-col rounded-t-2xl"
                showCloseButton
            >
                <SheetHeader>
                    <SheetTitle>{sheetTitle}</SheetTitle>
                    <SheetDescription className="sr-only">
                        {mode === "view"
                            ? "Chi tiết đơn hàng của bàn"
                            : "Chọn món để tạo đơn hàng mới"}
                    </SheetDescription>
                </SheetHeader>

                {mode === "view" && activeOrder ? (
                    <OrderViewMode
                        order={activeOrder}
                        tableLabel={tableLabel}
                        onClose={() => onOpenChange(false)}
                    />
                ) : (
                    <CreateOrderMode
                        tableId={tableId}
                        tableLabel={tableLabel}
                        menuItems={menuItems}
                        categories={categories}
                        terminalId={terminalId}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
