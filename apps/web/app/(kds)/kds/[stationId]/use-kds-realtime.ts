"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@comtammatu/database/src/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

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

export function useKdsRealtime(
  stationId: number,
  initialTickets: KdsTicket[]
) {
  const [tickets, setTickets] = useState<KdsTicket[]>(initialTickets);

  const handleTicketChange = useCallback(
    (
      payload: RealtimePostgresChangesPayload<Record<string, unknown>>
    ) => {
      const eventType = payload.eventType;

      if (eventType === "INSERT") {
        const newTicket = payload.new as unknown as KdsTicket;
        // Only add if it's for our station and active
        if (
          newTicket.station_id === stationId &&
          (newTicket.status === "pending" || newTicket.status === "preparing")
        ) {
          setTickets((prev) => {
            // Avoid duplicates
            if (prev.some((t) => t.id === newTicket.id)) return prev;
            return [...prev, newTicket];
          });
        }
      }

      if (eventType === "UPDATE") {
        const updated = payload.new as unknown as KdsTicket;

        if (updated.status === "ready" || updated.status === "cancelled") {
          // Remove from board
          setTickets((prev) => prev.filter((t) => t.id !== updated.id));
        } else {
          // Update in place
          setTickets((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
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

  useEffect(() => {
    const supabase = createClient();

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stationId, handleTicketChange]);

  // Sync with server-provided initial tickets
  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  return tickets;
}
