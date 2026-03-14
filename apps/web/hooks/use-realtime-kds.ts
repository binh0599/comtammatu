"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@comtammatu/database/src/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import { useStationTicketsQuery } from "@/hooks/queries/use-kds-query";
import {
  useBumpTicketMutation,
  useRecallTicketMutation,
} from "@/hooks/mutations/use-kds-mutations";

/**
 * Hook kết hợp React Query + Supabase Realtime + Optimistic mutations cho KDS.
 *
 * 1. Fetch ban đầu qua React Query (useStationTicketsQuery)
 * 2. Subscribe Supabase Realtime postgres_changes
 * 3. Cập nhật React Query cache trực tiếp khi nhận event
 * 4. Optimistic mutations cho bump/recall
 *
 * QUAN TRỌNG: Khi merge realtime UPDATE payloads, luôn giữ lại
 * joined relations mà payload không bao gồm (lessons learned).
 */
export function useRealtimeKds(stationId: number) {
  const queryClient = useQueryClient();

  // 1. Initial fetch
  const ticketsQuery = useStationTicketsQuery(stationId);

  // 2. Optimistic mutations
  const bumpMutation = useBumpTicketMutation(stationId);
  const recallMutation = useRecallTicketMutation(stationId);

  // 3. Supabase Realtime subscription
  useEffect(() => {
    if (stationId <= 0) return;

    const supabase = createClient();
    const ticketQueryKey = queryKeys.kds.tickets(stationId);

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
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === "INSERT") {
            // Thêm ticket mới vào đầu danh sách
            queryClient.setQueryData(
              ticketQueryKey,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (old: any[] | undefined) => {
                if (!old) return [newRecord];
                // Tránh trùng lặp nếu đã có
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (old.some((t: any) => t.id === newRecord.id)) return old;
                return [newRecord, ...old];
              }
            );
          } else if (eventType === "UPDATE") {
            queryClient.setQueryData(
              ticketQueryKey,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (old: any[] | undefined) => {
                if (!old) return old;
                return old.map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (ticket: any) => {
                    if (ticket.id !== newRecord.id) return ticket;

                    // QUAN TRỌNG: Giữ lại joined relations không có trong payload
                    // postgres_changes chỉ chứa raw columns, không có joins
                    return {
                      ...ticket,
                      ...newRecord,
                      // Bảo toàn joined relations
                      order_items: newRecord.order_items ?? ticket.order_items,
                      orders: newRecord.orders ?? ticket.orders,
                    };
                  }
                );
              }
            );
          } else if (eventType === "DELETE") {
            queryClient.setQueryData(
              ticketQueryKey,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (old: any[] | undefined) => {
                if (!old) return old;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return old.filter((t: any) => t.id !== oldRecord.id);
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stationId, queryClient]);

  // 4. Wrapped actions
  const bumpTicket = useCallback(
    (ticketId: number, newStatus: "preparing" | "ready") =>
      bumpMutation.mutate({ ticketId, newStatus }),
    [bumpMutation]
  );

  const recallTicket = useCallback(
    (ticketId: number) => recallMutation.mutate(ticketId),
    [recallMutation]
  );

  return {
    tickets: ticketsQuery.data ?? [],
    isLoading: ticketsQuery.isLoading,
    error: ticketsQuery.error,

    // Actions
    bumpTicket,
    recallTicket,
    isBumping: bumpMutation.isPending,
    isRecalling: recallMutation.isPending,
  };
}
