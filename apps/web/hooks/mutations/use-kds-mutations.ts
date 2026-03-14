"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { bumpTicket, recallTicket } from "@/app/(kds)/kds/[stationId]/actions";
import { toast } from "sonner";

/** Minimal KDS ticket shape used in optimistic cache updates */
interface CachedTicket {
  id: number;
  status: string;
  [key: string]: unknown;
}

export function useBumpTicketMutation(stationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { ticketId: number; newStatus: "preparing" | "ready" }) =>
      bumpTicket(args.ticketId, args.newStatus),
    onMutate: async (variables) => {
      const ticketQueryKey = queryKeys.kds.tickets(stationId);

      // Hủy queries đang chạy
      await queryClient.cancelQueries({ queryKey: ticketQueryKey });

      // Snapshot để rollback
      const previousTickets = queryClient.getQueryData(ticketQueryKey);

      // Optimistic update: thay đổi status của ticket trong cache
      queryClient.setQueryData(ticketQueryKey, (old: CachedTicket[] | undefined) => {
        if (!old || !Array.isArray(old)) return old;
        if (variables.newStatus === "ready") {
          // Khi bump sang "ready" → xóa khỏi danh sách pending/preparing
          return old.filter((ticket) => ticket.id !== variables.ticketId);
        }
        // Khi bump sang "preparing" → cập nhật status
        return old.map((ticket) =>
          ticket.id === variables.ticketId ? { ...ticket, status: variables.newStatus } : ticket
        );
      });

      return { previousTickets };
    },
    onError: (_error, _variables, context) => {
      // Rollback
      if (context?.previousTickets !== undefined) {
        queryClient.setQueryData(queryKeys.kds.tickets(stationId), context.previousTickets);
      }
      toast.error("Không thể cập nhật ticket. Vui lòng thử lại.");
    },
    onSettled: () => {
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
    onMutate: async (ticketId) => {
      const ticketQueryKey = queryKeys.kds.tickets(stationId);
      await queryClient.cancelQueries({ queryKey: ticketQueryKey });
      const previousTickets = queryClient.getQueryData(ticketQueryKey);

      // Optimistic: đưa ticket về trạng thái "pending"
      queryClient.setQueryData(ticketQueryKey, (old: CachedTicket[] | undefined) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, status: "pending" } : ticket
        );
      });

      return { previousTickets };
    },
    onError: (_error, _ticketId, context) => {
      if (context?.previousTickets !== undefined) {
        queryClient.setQueryData(queryKeys.kds.tickets(stationId), context.previousTickets);
      }
      toast.error("Không thể recall ticket.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.kds.tickets(stationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
