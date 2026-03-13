"use client";
import { create } from "zustand";

interface CartItem {
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  variantId?: number;
  variantName?: string;
  notes?: string;
  sideItemIds?: number[];
}

interface PosUiState {
  // Cart
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (menuItemId: number, variantId?: number) => void;
  updateCartItemQuantity: (
    menuItemId: number,
    quantity: number,
    variantId?: number,
  ) => void;
  clearCart: () => void;

  // Table selection
  selectedTableId: number | null;
  selectTable: (tableId: number | null) => void;

  // Category filter
  selectedCategoryId: number | null;
  selectCategory: (categoryId: number | null) => void;

  // Order type
  orderType: "dine_in" | "takeaway";
  setOrderType: (type: "dine_in" | "takeaway") => void;

  // Guest count
  guestCount: number;
  setGuestCount: (count: number) => void;
}

export const usePosUiStore = create<PosUiState>((set) => ({
  // Cart
  cart: [],
  addToCart: (item) =>
    set((state) => {
      const existing = state.cart.find(
        (c) =>
          c.menuItemId === item.menuItemId && c.variantId === item.variantId,
      );
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c.menuItemId === item.menuItemId && c.variantId === item.variantId
              ? { ...c, quantity: c.quantity + (item.quantity ?? 1) }
              : c,
          ),
        };
      }
      return { cart: [...state.cart, { ...item, quantity: item.quantity ?? 1 }] };
    }),
  removeFromCart: (menuItemId, variantId) =>
    set((state) => ({
      cart: state.cart.filter(
        (c) => !(c.menuItemId === menuItemId && c.variantId === variantId),
      ),
    })),
  updateCartItemQuantity: (menuItemId, quantity, variantId) =>
    set((state) => ({
      cart:
        quantity <= 0
          ? state.cart.filter(
              (c) =>
                !(c.menuItemId === menuItemId && c.variantId === variantId),
            )
          : state.cart.map((c) =>
              c.menuItemId === menuItemId && c.variantId === variantId
                ? { ...c, quantity }
                : c,
            ),
    })),
  clearCart: () => set({ cart: [] }),

  // Table
  selectedTableId: null,
  selectTable: (tableId) => set({ selectedTableId: tableId }),

  // Category
  selectedCategoryId: null,
  selectCategory: (categoryId) => set({ selectedCategoryId: categoryId }),

  // Order type
  orderType: "dine_in",
  setOrderType: (type) => set({ orderType: type }),

  // Guest count
  guestCount: 1,
  setGuestCount: (count) => set({ guestCount: Math.max(1, count) }),
}));
