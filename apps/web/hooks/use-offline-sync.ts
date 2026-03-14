"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { useOnlineStatusWithReconnect } from "./use-online-status";
import { syncPendingOrders, type SyncResult } from "@/app/(pos)/pos/lib/offline-queue";
import { getPendingOrderCount } from "@/app/(pos)/pos/lib/offline-db";

/**
 * Hook that automatically syncs pending offline orders when connectivity returns.
 * Shows toast notifications for sync progress and results.
 */
export function useOfflineSync() {
  const { isOnline, justReconnected } = useOnlineStatusWithReconnect();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingOrderCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available — ignore
    }
  }, []);

  // Refresh count on mount and when online status changes
  useEffect(() => {
    refreshCount();
  }, [isOnline, refreshCount]);

  // Sync when coming back online
  useEffect(() => {
    if (!justReconnected || syncingRef.current) return;

    async function doSync() {
      if (syncingRef.current) return;
      syncingRef.current = true;
      setIsSyncing(true);

      const count = await getPendingOrderCount();
      if (count === 0) {
        syncingRef.current = false;
        setIsSyncing(false);
        return;
      }

      toast.info(`Đang đồng bộ ${count} đơn hàng offline...`);

      try {
        const result: SyncResult = await syncPendingOrders();

        if (result.synced > 0) {
          toast.success(`Đã đồng bộ ${result.synced} đơn hàng thành công`);
        }

        if (result.failed > 0) {
          toast.error(`${result.failed} đơn hàng không đồng bộ được. Kiểm tra danh sách đơn chờ.`);
        }
      } catch {
        toast.error("Lỗi khi đồng bộ đơn hàng offline");
      } finally {
        syncingRef.current = false;
        setIsSyncing(false);
        await refreshCount();
      }
    }

    doSync();
  }, [justReconnected, refreshCount]);

  return { isOnline, pendingCount, isSyncing, refreshCount };
}
