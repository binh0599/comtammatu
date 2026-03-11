"use client";

import { useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfflineFallback } from "./offline-fallback";

/**
 * Error boundary for the new order page.
 * When RSC data fetch fails (offline, server error), renders
 * an offline fallback that loads cached menu/tables from IndexedDB.
 */
export default function NewOrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[New Order Error]", error);
  }, [error]);

  // If online, show a retry option
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (isOnline) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-full bg-red-100 p-4">
          <WifiOff className="size-8 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold">Không thể tải dữ liệu</h2>
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          Đã xảy ra lỗi khi tải menu. Vui lòng thử lại.
        </p>
        <Button onClick={reset} variant="outline">
          <RefreshCw className="mr-2 size-4" />
          Thử lại
        </Button>
      </div>
    );
  }

  // Offline — use cached data
  return <OfflineFallback />;
}
