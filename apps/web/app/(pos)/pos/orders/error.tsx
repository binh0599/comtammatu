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
          Không thể tải danh sách đơn hàng
        </p>
        <p className="text-xs text-muted-foreground mb-3">{error.digest ? "Lỗi hệ thống. Vui lòng thử lại sau." : error.message}</p>
        <Button size="sm" variant="outline" onClick={reset}>
          Tải lại
        </Button>
      </div>
    </div>
  );
}
