"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@comtammatu/database/src/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface Order {
  id: number;
  order_number: string;
  status: string;
  type: string;
  total: number;
  created_at: string;
  table_id: number | null;
  branch_id: number;
}

export function useRealtimeOrders<T extends Order>(
  branchId: number,
  initialOrders: T[]
) {
  const [orders, setOrders] = useState<T[]>(initialOrders);

  const handleOrderChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const eventType = payload.eventType;

      if (eventType === "INSERT") {
        const newOrder = payload.new as unknown as T;
        if (newOrder.branch_id === branchId) {
          setOrders((prev) => {
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
        }
      }

      if (eventType === "UPDATE") {
        const updated = payload.new as unknown as T;
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        );
      }

      if (eventType === "DELETE") {
        const old = payload.old as { id?: number };
        if (old.id) {
          setOrders((prev) => prev.filter((o) => o.id !== old.id));
        }
      }
    },
    [branchId]
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`orders-branch-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${branchId}`,
        },
        handleOrderChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, handleOrderChange]);

  // Sync with server-provided data
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  return orders;
}
