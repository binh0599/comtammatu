"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function OrderDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Không thể tải chi tiết đơn hàng"
      homeHref="/pos/orders"
      homeLabel="Danh sách đơn"
      variant="minimal"
    />
  );
}
