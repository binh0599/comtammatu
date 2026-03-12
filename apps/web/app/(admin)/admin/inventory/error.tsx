"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function InventoryError({
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
      title="Lỗi trang Kho hàng"
      homeHref="/admin"
      variant="card"
    />
  );
}
