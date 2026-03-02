"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@comtammatu/database/src/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface KdsTicket {
  id: number;
  order_id: number;
  station_id: number;
  status: string;
  items: unknown;
  priority: number | null;
  color_code: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  orders: {
    order_number: string;
    table_id: number | null;
    tables: { number: number } | null;
  } | null;
}

const MAX_RECONNECT_DELAY = 30_000;
const FULL_REFRESH_INTERVAL = 60_000;

export function useKdsRealtime(
  stationId: number,
  initialTickets: KdsTicket[],
  refetchTickets: (stationId: number) => Promise<KdsTicket[]>,
) {
  const [tickets, setTickets] = useState<KdsTicket[]>(initialTickets);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const reconnectAttemptRef = useRef(0);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const handleTicketChange = useCallback(
    (
      payload: RealtimePostgresChangesPayload<Record<string, unknown>>
    ) => {
      const eventType = payload.eventType;

      if (eventType === "INSERT") {
        const newTicket = payload.new as unknown as KdsTicket;
        if (
          newTicket.station_id === stationId &&
          (newTicket.status === "pending" || newTicket.status === "preparing")
        ) {
          setTickets((prev) => {
            if (prev.some((t) => t.id === newTicket.id)) return prev;
            return [...prev, newTicket];
          });
        }
      }

      if (eventType === "UPDATE") {
        const updated = payload.new as unknown as KdsTicket;

        if (updated.status === "ready" || updated.status === "cancelled") {
          setTickets((prev) => prev.filter((t) => t.id !== updated.id));
        } else {
          setTickets((prev) =>
            prev.map((t) =>
              t.id === updated.id
                ? { ...t, ...updated, orders: updated.orders ?? t.orders }
                : t
            )
          );
        }
      }

      if (eventType === "DELETE") {
        const old = payload.old as { id?: number };
        if (old.id) {
          setTickets((prev) => prev.filter((t) => t.id !== old.id));
        }
      }
    },
    [stationId]
  );

  // Subscribe with connection tracking + exponential backoff
  useEffect(() => {
    const supabase = createClient();
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;

    function subscribe() {
      if (isUnmounted) return;

      setConnectionStatus("connecting");

      const channel = supabase
        .channel(`kds-station-${stationId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "kds_tickets",
            filter: `station_id=eq.${stationId}`,
          },
          handleTicketChange
        )
        .subscribe((status) => {
          if (isUnmounted) return;

          if (status === "SUBSCRIBED") {
            setConnectionStatus("connected");
            reconnectAttemptRef.current = 0;
          } else if (status === "CLOSED") {
            setConnectionStatus("disconnected");
            scheduleReconnect();
          } else if (status === "CHANNEL_ERROR") {
            setConnectionStatus("error");
            scheduleReconnect();
          } else if (status === "TIMED_OUT") {
            setConnectionStatus("disconnected");
            scheduleReconnect();
          }
        });

      channelRef.current = channel;
    }

    function scheduleReconnect() {
      if (isUnmounted || reconnectTimer) return;

      const delay = Math.min(
        1000 * Math.pow(2, reconnectAttemptRef.current),
        MAX_RECONNECT_DELAY,
      );
      reconnectAttemptRef.current++;

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        subscribe();
      }, delay);
    }

    subscribe();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [stationId, handleTicketChange]);

  // Periodic full-refresh to catch missed events
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await refetchTickets(stationId);
        setTickets(fresh);
      } catch {
        // Silently fail — realtime continues
      }
    }, FULL_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [stationId, refetchTickets]);

  // Sync with server-provided initial tickets
  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  return { tickets, connectionStatus };
}
