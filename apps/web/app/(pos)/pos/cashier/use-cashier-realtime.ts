"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@comtammatu/database/src/supabase/client";
import { useRouter } from "next/navigation";
import type { QueueOrder } from "./types";

/**
 * Hook that subscribes to real-time order changes for the cashier view.
 * Listens to both:
 * 1. Supabase Realtime postgres_changes on the `orders` table (for DB-level updates like KDS triggers)
 * 2. Broadcast channel for instant UI refresh
 *
 * When a change is detected, triggers a Next.js router.refresh() to re-fetch server data.
 */
export function useCashierRealtime(initialOrders: QueueOrder[], branchId: number) {
  const [orders, setOrders] = useState<QueueOrder[]>(initialOrders);
  const router = useRouter();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with server-provided initial data
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Debounced refresh to avoid rapid-fire refreshes
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      router.refresh();
    }, 500);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    // 1. Listen for postgres_changes on orders table
    //    This catches DB trigger updates (e.g. update_order_from_kds)
    const channel = supabase
      .channel(`cashier-orders-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        () => {
          // Any order update triggers a refresh of the cashier page
          debouncedRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        () => {
          debouncedRefresh();
        }
      )
      .subscribe();

    // 2. Also listen to broadcast channel for instant notification-driven refreshes
    const broadcastChannel = supabase
      .channel(`cashier-broadcast-${branchId}`)
      .on("broadcast", { event: "notification" }, () => {
        debouncedRefresh();
      })
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [branchId, debouncedRefresh]);

  return { orders };
}
