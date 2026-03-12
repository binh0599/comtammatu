"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function CrmError({
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
      title="Lỗi trang Khách hàng"
      homeHref="/admin"
      variant="card"
    />
  );
}
