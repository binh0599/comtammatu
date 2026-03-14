"use client";

import { usePosUiStore } from "@/stores/pos-ui-store";
import { useCreateOrderMutation } from "@/hooks/mutations/use-order-mutations";

/**
 * Hook kết hợp Zustand cart state + React Query mutation.
 *
 * Cart operations (add/remove/update) là instant qua Zustand.
 * Submit order sử dụng React Query mutation với optimistic update.
 *
 * @example
 * ```tsx
 * const { cart, addToCart, removeFromCart, submitOrder, isSubmitting } = useOptimisticCart(terminalId);
 * ```
 */
export function useOptimisticCart(terminalId: number) {
  const cart = usePosUiStore((s) => s.cart);
  const addToCart = usePosUiStore((s) => s.addToCart);
  const removeFromCart = usePosUiStore((s) => s.removeFromCart);
  const updateQuantity = usePosUiStore((s) => s.updateCartItemQuantity);
  const clearCart = usePosUiStore((s) => s.clearCart);
  const selectedTableId = usePosUiStore((s) => s.selectedTableId);
  const orderType = usePosUiStore((s) => s.orderType);
  const guestCount = usePosUiStore((s) => s.guestCount);

  const createOrderMutation = useCreateOrderMutation();

  /** Tính tổng tiền giỏ hàng */
  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  /** Tổng số món trong giỏ */
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  /**
   * Gửi đơn hàng từ giỏ hàng hiện tại.
   * Tự động clear cart khi thành công.
   */
  async function submitOrder() {
    if (cart.length === 0) return;

    const items = cart.map((item) => ({
      menu_item_id: item.menuItemId,
      variant_id: item.variantId,
      quantity: item.quantity,
      notes: item.notes,
      side_items: item.sideItemIds?.map((id) => ({
        menu_item_id: id,
        quantity: 1,
      })),
    }));

    const result = await createOrderMutation.mutateAsync({
      type: orderType,
      table_id: orderType === "dine_in" ? selectedTableId : null,
      guest_count: orderType === "dine_in" ? guestCount : null,
      terminal_id: terminalId,
      items,
    });

    // Clear cart khi tạo đơn thành công
    if (result && !("error" in result)) {
      clearCart();
    }

    return result;
  }

  return {
    // Cart state (Zustand - instant)
    cart,
    cartTotal,
    cartItemCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,

    // Order state
    selectedTableId,
    orderType,
    guestCount,

    // Mutation (React Query)
    submitOrder,
    isSubmitting: createOrderMutation.isPending,
    submitError: createOrderMutation.error,
  };
}
