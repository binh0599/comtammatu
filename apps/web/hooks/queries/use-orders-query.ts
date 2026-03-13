"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getOrders,
  getOrderDetail,
  getTablesWithActiveOrders,
} from "@/app/(pos)/pos/orders/actions";

export function useOrdersQuery(filters?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => getOrders(filters),
  });
}

export function useOrderDetailQuery(orderId: number) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrderDetail(orderId),
    enabled: orderId > 0,
  });
}

export function useTablesWithOrdersQuery() {
  return useQuery({
    queryKey: queryKeys.tables.withOrders,
    queryFn: () => getTablesWithActiveOrders(),
    refetchInterval: 30_000, // làm mới mỗi 30 giây cho POS
  });
}
