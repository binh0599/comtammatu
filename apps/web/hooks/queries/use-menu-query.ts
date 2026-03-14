"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getMenuItems, getMenuCategories } from "@/app/(pos)/pos/orders/actions";

export function useMenuItemsQuery() {
  return useQuery({
    queryKey: queryKeys.menu.items,
    queryFn: () => getMenuItems(),
    staleTime: 10 * 60 * 1000, // thực đơn ít thay đổi
  });
}

export function useMenuCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.menu.categories,
    queryFn: () => getMenuCategories(),
    staleTime: 10 * 60 * 1000,
  });
}
