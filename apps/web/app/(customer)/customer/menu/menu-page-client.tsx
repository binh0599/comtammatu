"use client";

import type { ReactNode } from "react";
import { CartProvider } from "./cart-context";
import { CartDrawer } from "./cart-drawer";

interface MenuPageClientProps {
  branchId: number;
  children: ReactNode;
}

export function MenuPageClient({ branchId, children }: MenuPageClientProps) {
  return (
    <CartProvider>
      {children}
      <CartDrawer branchId={branchId} />
    </CartProvider>
  );
}
