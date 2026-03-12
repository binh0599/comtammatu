"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function ReportsError({
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
      title="Lỗi trang Báo cáo"
      homeHref="/admin"
      variant="card"
    />
  );
}
