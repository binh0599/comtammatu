"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function MenuError({
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
      title="Lỗi trang Thực đơn"
      homeHref="/admin"
      variant="card"
    />
  );
}
