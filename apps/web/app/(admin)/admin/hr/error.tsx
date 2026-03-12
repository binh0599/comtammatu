"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function HrError({
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
      title="Lỗi trang Nhân sự"
      homeHref="/admin"
      variant="card"
    />
  );
}
