"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function KdsStationsError({
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
      title="Lỗi trang Trạm bếp"
      homeHref="/admin"
      variant="card"
    />
  );
}
