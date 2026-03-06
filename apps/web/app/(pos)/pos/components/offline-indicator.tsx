"use client";

import { Wifi, WifiOff, CloudUpload, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOfflineSync } from "@/hooks/use-offline-sync";

/**
 * Compact status indicator for the POS header.
 * Shows online/offline state and pending order count.
 */
export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  if (isSyncing) {
    return (
      <Badge
        variant="outline"
        className="border-blue-300 bg-blue-50 text-blue-700 gap-1.5"
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        Đang đồng bộ...
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="destructive"
          className="gap-1.5"
        >
          <WifiOff className="h-3 w-3" aria-hidden="true" />
          Ngoại tuyến
        </Badge>
        {pendingCount > 0 && (
          <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700 gap-1.5">
            <CloudUpload className="h-3 w-3" aria-hidden="true" />
            {pendingCount} đơn chờ
          </Badge>
        )}
      </div>
    );
  }

  // Online with pending orders (failed sync or just connected)
  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-green-300 bg-green-50 text-green-700 gap-1.5"
        >
          <Wifi className="h-3 w-3" aria-hidden="true" />
          Trực tuyến
        </Badge>
        <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700 gap-1.5">
          <CloudUpload className="h-3 w-3" aria-hidden="true" />
          {pendingCount} đơn chờ
        </Badge>
      </div>
    );
  }

  // Fully online, no pending
  return null;
}
