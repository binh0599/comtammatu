"use client";

import { Button } from "@/components/ui/button";

export default function KdsStationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center max-w-sm">
        <p className="text-sm font-medium text-destructive mb-1">KDS gặp lỗi</p>
        <p className="text-xs text-muted-foreground mb-4">{error.digest ? "Lỗi hệ thống. Vui lòng thử lại sau." : error.message}</p>
        <Button onClick={reset}>Thử lại</Button>
      </div>
    </div>
  );
}
