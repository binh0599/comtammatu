"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { createOrder, updateOrderStatus } from "@/app/(pos)/pos/orders/actions";
import { toast } from "sonner";

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onMutate: async () => {
      // Hủy các queries đang chạy để tránh overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.tables.withOrders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.withOrders });
    },
    onError: (_error) => {
      // Refetch để đồng bộ lại state thật
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.withOrders });
      toast.error("Không thể tạo đơn hàng. Vui lòng thử lại.");
    },
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { order_id: number; status: string }) =>
      updateOrderStatus(args),
    onMutate: async (variables) => {
      // Hủy queries đang chạy
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.all });

      // Snapshot dữ liệu hiện tại để rollback nếu cần
      const previousOrders = queryClient.getQueriesData({
        queryKey: queryKeys.orders.all,
      });

      // Optimistic update: cập nhật status trong cache
      queryClient.setQueriesData(
        { queryKey: queryKeys.orders.all },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (order: any) =>
              order.id === variables.order_id
                ? { ...order, status: variables.status }
                : order,
          );
        },
      );

      return { previousOrders };
    },
    onError: (_error, _variables, context) => {
      // Rollback về snapshot
      if (context?.previousOrders) {
        for (const [queryKey, data] of context.previousOrders) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error("Không thể cập nhật trạng thái đơn hàng.");
    },
    onSettled: () => {
      // Luôn refetch để đồng bộ với server
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.withOrders });
    },
  });
}
