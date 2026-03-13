"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  bumpTicket,
  recallTicket,
} from "@/app/(kds)/kds/[stationId]/actions";

export function useBumpTicketMutation(stationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      ticketId: number;
      newStatus: "preparing" | "ready";
    }) => bumpTicket(args.ticketId, args.newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.kds.tickets(stationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useRecallTicketMutation(stationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: number) => recallTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.kds.tickets(stationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
