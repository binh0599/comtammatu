"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function PaymentsError({
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
      title="Lỗi trang Thanh toán"
      homeHref="/admin"
      variant="card"
    />
  );
}
