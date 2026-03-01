"use client";

import { useEffect } from "react";
import { createClient } from "@comtammatu/database/src/supabase/client";
import { toast } from "sonner";

interface BroadcastEvent {
  type: "order_ready" | "new_order" | "order_cancelled" | "info";
  message: string;
  order_number?: string;
}

export function useRealtimeBroadcast(branchId: number) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`branch:${branchId}:notifications`)
      .on("broadcast", { event: "notification" }, ({ payload }) => {
        const event = payload as BroadcastEvent;

        switch (event.type) {
          case "order_ready":
            toast.success(event.message, {
              description: event.order_number
                ? `Đơn ${event.order_number}`
                : undefined,
            });
            break;
          case "new_order":
            toast.info(event.message, {
              description: event.order_number
                ? `Đơn ${event.order_number}`
                : undefined,
            });
            break;
          case "order_cancelled":
            toast.error(event.message, {
              description: event.order_number
                ? `Đơn ${event.order_number}`
                : undefined,
            });
            break;
          default:
            toast(event.message);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);
}
