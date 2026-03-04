"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Send,
    CheckCircle,
    Banknote,
    XCircle,
    ArrowRight,
    PlusCircle,
    ArrowLeft,
    Users,
    Minus,
    Plus,
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
import { ORDER_STATUS_VARIANT } from "@/lib/ui-constants";
import { MenuSelector, type CartItem } from "./order/new/menu-selector";
import { OrderCart } from "./order/new/order-cart";
import {
    createOrder,
    confirmOrder,
    updateOrderStatus,
    addOrderItems,
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
    guest_count?: number;
    sub_order_index?: number;
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
// GuestCountSelector — select number of guests before ordering
// ---------------------------------------------------------------------------

function GuestCountSelector({
    tableLabel,
    tableCapacity,
    existingGuestCount,
    onConfirm,
    onCancel,
}: {
    tableLabel: string;
    tableCapacity: number;
    existingGuestCount: number;
    onConfirm: (guestCount: number) => void;
    onCancel: () => void;
}) {
    const maxGuests = Math.max(1, tableCapacity - existingGuestCount);
    const [count, setCount] = useState(1);

    return (
        <div className="flex flex-1 flex-col items-center justify-center p-6">
            <div className="w-full max-w-xs space-y-6">
                <div className="text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden="true" />
                    <h3 className="text-lg font-bold">{tableLabel}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Chọn số khách cho đơn hàng mới
                    </p>
                    {existingGuestCount > 0 && (
                        <p className="mt-1 text-xs text-orange-600">
                            Hiện tại: {existingGuestCount}/{tableCapacity} chỗ đã có khách
                        </p>
                    )}
                </div>

                {/* Counter */}
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

                {/* Quick select buttons */}
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

                {/* Remaining seats info */}
                <div className="rounded-lg border bg-muted/30 p-3 text-center text-sm">
                    <span className="text-muted-foreground">Còn lại: </span>
                    <span className="font-bold text-green-600">{maxGuests - count} chỗ trống</span>
                    <span className="text-muted-foreground"> / {tableCapacity} chỗ</span>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    <Button onClick={() => onConfirm(count)} className="w-full gap-2">
                        <Users className="h-4 w-4" aria-hidden="true" />
                        Xác nhận {count} khách — Chọn món
                    </Button>
                    <Button variant="ghost" onClick={onCancel} className="w-full">
                        Hủy
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// OrderListMode – shows multiple active orders on same table (split orders)
// ---------------------------------------------------------------------------

function OrderListMode({
    orders,
    tableLabel,
    tableNumber,
    tableCapacity,
    onSelectOrder,
    onCreateNew,
}: {
    orders: ActiveOrder[];
    tableLabel: string;
    tableNumber?: number;
    tableCapacity: number;
    onSelectOrder: (order: ActiveOrder) => void;
    onCreateNew: () => void;
}) {
    const totalGuests = orders.reduce((sum, o) => sum + (o.guest_count ?? 0), 0);
    const remainingSeats = tableCapacity - totalGuests;

    return (
        <div className="flex flex-1 flex-col">
            <div className="space-y-2 p-4">
                <p className="text-muted-foreground text-sm">
                    {tableLabel} — {orders.length} đơn đang phục vụ
                </p>
                {totalGuests > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{totalGuests}/{tableCapacity} khách</span>
                        {remainingSeats > 0 && (
                            <span className="ml-auto text-green-600 font-medium">
                                +{remainingSeats} chỗ trống
                            </span>
                        )}
                    </div>
                )}

                {orders.map((order, index) => {
                    const subLabel = orders.length > 1 && tableNumber
                        ? `${tableLabel} .${index + 1}`
                        : null;
                    return (
                        <button
                            key={order.id}
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="w-full rounded-lg border p-4 text-left transition-all hover:bg-accent active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{order.order_number}</span>
                                    {subLabel && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {subLabel}
                                        </Badge>
                                    )}
                                </div>
                                <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? "secondary"}>
                                    {getOrderStatusLabel(order.status)}
                                </Badge>
                            </div>
                            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                                <span>{order.item_count} món</span>
                                {order.guest_count && order.guest_count > 0 && (
                                    <>
                                        <span className="text-muted-foreground">·</span>
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {order.guest_count} khách
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="mt-1 font-semibold">
                                {formatPrice(order.total)}
                            </div>
                        </button>
                    );
                })}
            </div>

            {remainingSeats > 0 && (
                <div className="mt-auto border-t p-4">
                    <Button
                        onClick={onCreateNew}
                        className="w-full gap-2"
                    >
                        <PlusCircle className="h-4 w-4" aria-hidden="true" />
                        Thêm đơn mới ({remainingSeats} chỗ trống)
                    </Button>
                </div>
            )}

            {remainingSeats <= 0 && (
                <div className="mt-auto border-t p-4">
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center text-sm text-orange-700">
                        Bàn đã đầy ({totalGuests}/{tableCapacity} khách)
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// OrderViewMode – shows active order details
// ---------------------------------------------------------------------------

function OrderViewMode({
    order,
    tableLabel,
    tableNumber,
    orderIndex,
    totalOrders,
    onClose,
    onAddItems,
    onBackToList,
    showBackToList = false,
}: {
    order: ActiveOrder;
    tableLabel: string;
    tableNumber?: number;
    orderIndex?: number;
    totalOrders?: number;
    onClose: () => void;
    onAddItems: () => void;
    onBackToList?: () => void;
    showBackToList?: boolean;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const canAddItems = !["completed", "cancelled"].includes(order.status);

    // Sub-order label (e.g., Bàn 1.2)
    const subLabel = totalOrders && totalOrders > 1 && orderIndex && tableNumber
        ? `${tableLabel} .${orderIndex}`
        : null;

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
                        <div className="flex items-center gap-2">
                            <p className="text-lg font-bold">{order.order_number}</p>
                            {subLabel && (
                                <Badge variant="outline" className="text-xs">
                                    {subLabel}
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground text-sm">{tableLabel}</p>
                    </div>
                    <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? "secondary"}>
                        {getOrderStatusLabel(order.status)}
                    </Badge>
                </div>

                <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-sm">
                                {order.item_count} món
                            </span>
                            {order.guest_count && order.guest_count > 0 && (
                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                    {order.guest_count} khách
                                </span>
                            )}
                        </div>
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
                {/* Add items button — available for all active orders */}
                {canAddItems && (
                    <Button
                        variant="outline"
                        onClick={onAddItems}
                        className="w-full gap-2"
                    >
                        <PlusCircle className="h-4 w-4" aria-hidden="true" />
                        Thêm món
                    </Button>
                )}

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

                {/* Back to order list (multi-order per table) */}
                {showBackToList && onBackToList && (
                    <Button
                        variant="ghost"
                        className="w-full gap-2"
                        onClick={onBackToList}
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Danh sách đơn trên bàn
                    </Button>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// AddItemsMode – add items to existing order
// ---------------------------------------------------------------------------

function AddItemsMode({
    orderId,
    orderNumber,
    tableLabel,
    menuItems,
    categories,
    onClose,
    onBack,
}: {
    orderId: number;
    orderNumber: string;
    tableLabel: string;
    menuItems: MenuItem[];
    categories: Category[];
    onClose: () => void;
    onBack: () => void;
}) {
    const router = useRouter();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isPending, startTransition] = useTransition();

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

    function handleSubmit() {
        if (cart.length === 0) {
            toast.error("Chưa chọn món nào");
            return;
        }

        startTransition(async () => {
            const result = await addOrderItems({
                order_id: orderId,
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

            const addedQty = cart.reduce((sum, item) => sum + item.quantity, 0);
            toast.success(`Đã thêm ${addedQty} món vào ${orderNumber}`);
            onClose();
            router.refresh();
        });
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 pb-2">
                <Button variant="ghost" size="icon" onClick={onBack} aria-label="Quay lại">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <p className="text-sm font-medium">Thêm món vào {orderNumber}</p>
                    <p className="text-muted-foreground text-xs">{tableLabel}</p>
                </div>
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
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-3">
                    <Button
                        className="w-full gap-2"
                        onClick={handleSubmit}
                        disabled={isPending}
                    >
                        <PlusCircle className="h-4 w-4" aria-hidden="true" />
                        {isPending ? "Đang thêm..." : `Thêm ${cart.reduce((s, i) => s + i.quantity, 0)} món`}
                    </Button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// CreateOrderMode – menu selector for new order
// ---------------------------------------------------------------------------

function CreateOrderMode({
    tableId,
    tableLabel,
    guestCount,
    menuItems,
    categories,
    terminalId,
    onClose,
}: {
    tableId: number | null;
    tableLabel: string;
    guestCount: number;
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
            guest_count: guestCount > 0 ? guestCount : undefined,
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
                <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">{tableLabel}</p>
                    {guestCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            <Users className="h-3 w-3" />
                            {guestCount} khách
                        </span>
                    )}
                </div>
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
    mode: initialMode,
    tableId,
    tableLabel,
    tableCapacity = 4,
    activeOrder,
    activeOrders = [],
    menuItems,
    categories,
    terminalId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "view" | "create" | "list";
    tableId: number | null;
    tableLabel: string;
    tableCapacity?: number;
    activeOrder: ActiveOrder | null;
    activeOrders?: ActiveOrder[];
    menuItems: MenuItem[];
    categories: Category[];
    terminalId: number;
}) {
    const [internalMode, setInternalMode] = useState<"view" | "create" | "add-items" | "list" | "guest-count">(initialMode);
    const [selectedOrderFromList, setSelectedOrderFromList] = useState<ActiveOrder | null>(activeOrder);
    const [guestCount, setGuestCount] = useState(0);

    // Sync internalMode when the parent-supplied initialMode changes
    useEffect(() => {
        if (initialMode === "create" && tableId !== null && tableCapacity > 0) {
            // For dine-in, show guest count selector first
            setInternalMode("guest-count");
        } else {
            setInternalMode(initialMode);
        }
        setSelectedOrderFromList(activeOrder);
        setGuestCount(0);
    }, [initialMode, activeOrder, tableId, tableCapacity]);

    // Reset internal mode when sheet opens/closes
    const currentMode = open ? internalMode : initialMode;

    // The order currently being viewed
    const viewedOrder = currentMode === "view"
        ? (selectedOrderFromList ?? activeOrder)
        : null;

    const hasMultipleOrders = activeOrders.length > 1;

    // Calculate existing guest count across all orders on this table
    const existingGuestCount = activeOrders.reduce((sum, o) => sum + (o.guest_count ?? 0), 0);

    // Extract table number from label
    const tableNumber = tableLabel.startsWith("Bàn ") ? parseInt(tableLabel.replace("Bàn ", ""), 10) : undefined;

    function handleOpenChange(isOpen: boolean) {
        if (!isOpen) {
            if (initialMode === "create" && tableId !== null && tableCapacity > 0) {
                setInternalMode("guest-count");
            } else {
                setInternalMode(initialMode);
            }
            setSelectedOrderFromList(activeOrder);
            setGuestCount(0);
        }
        onOpenChange(isOpen);
    }

    function handleSelectOrderFromList(order: ActiveOrder) {
        setSelectedOrderFromList(order);
        setInternalMode("view");
    }

    function handleBackToList() {
        setSelectedOrderFromList(null);
        setInternalMode("list");
    }

    function handleGuestCountConfirm(count: number) {
        setGuestCount(count);
        setInternalMode("create");
    }

    function handleCreateNewFromList() {
        if (tableId !== null && tableCapacity > 0) {
            setInternalMode("guest-count");
        } else {
            setInternalMode("create");
        }
    }

    const sheetTitle =
        currentMode === "guest-count"
            ? `Số khách — ${tableLabel}`
            : currentMode === "list"
                ? `Đơn hàng — ${tableLabel}`
                : currentMode === "view"
                    ? `Đơn hàng — ${tableLabel}`
                    : currentMode === "add-items"
                        ? `Thêm món — ${tableLabel}`
                        : `Tạo đơn — ${tableLabel}`;

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="bottom"
                className="flex h-[85vh] flex-col rounded-t-2xl"
                showCloseButton
            >
                <SheetHeader>
                    <SheetTitle>{sheetTitle}</SheetTitle>
                    <SheetDescription className="sr-only">
                        {currentMode === "guest-count"
                            ? "Chọn số khách cho đơn hàng mới"
                            : currentMode === "list"
                                ? "Danh sách đơn hàng trên bàn"
                                : currentMode === "view"
                                    ? "Chi tiết đơn hàng của bàn"
                                    : currentMode === "add-items"
                                        ? "Thêm món vào đơn hàng hiện tại"
                                        : "Chọn món để tạo đơn hàng mới"}
                    </SheetDescription>
                </SheetHeader>

                {currentMode === "guest-count" ? (
                    <GuestCountSelector
                        tableLabel={tableLabel}
                        tableCapacity={tableCapacity}
                        existingGuestCount={existingGuestCount}
                        onConfirm={handleGuestCountConfirm}
                        onCancel={() => handleOpenChange(false)}
                    />
                ) : currentMode === "list" ? (
                    <OrderListMode
                        orders={activeOrders}
                        tableLabel={tableLabel}
                        tableNumber={tableNumber}
                        tableCapacity={tableCapacity}
                        onSelectOrder={handleSelectOrderFromList}
                        onCreateNew={handleCreateNewFromList}
                    />
                ) : currentMode === "view" && viewedOrder ? (
                    <OrderViewMode
                        order={viewedOrder}
                        tableLabel={tableLabel}
                        tableNumber={tableNumber}
                        orderIndex={viewedOrder.sub_order_index}
                        totalOrders={activeOrders.length}
                        onClose={() => handleOpenChange(false)}
                        onAddItems={() => setInternalMode("add-items")}
                        showBackToList={hasMultipleOrders}
                        onBackToList={handleBackToList}
                    />
                ) : currentMode === "add-items" && (selectedOrderFromList ?? activeOrder) ? (
                    <AddItemsMode
                        orderId={(selectedOrderFromList ?? activeOrder)!.id}
                        orderNumber={(selectedOrderFromList ?? activeOrder)!.order_number}
                        tableLabel={tableLabel}
                        menuItems={menuItems}
                        categories={categories}
                        onClose={() => handleOpenChange(false)}
                        onBack={() => setInternalMode("view")}
                    />
                ) : (
                    <CreateOrderMode
                        tableId={tableId}
                        tableLabel={tableLabel}
                        guestCount={guestCount}
                        menuItems={menuItems}
                        categories={categories}
                        terminalId={terminalId}
                        onClose={() => handleOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
