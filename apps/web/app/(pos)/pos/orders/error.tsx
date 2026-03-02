"use client";

import { Button } from "@/components/ui/button";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-4">
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm font-medium text-destructive mb-1">
          Khong the tai danh sach don hang
        </p>
        <p className="text-xs text-muted-foreground mb-3">{error.message}</p>
        <Button size="sm" variant="outline" onClick={reset}>
          Tai lai
        </Button>
      </div>
    </div>
  );
}
