"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function SecurityError({
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
      title="Lỗi trang Bảo mật"
      homeHref="/admin"
      variant="card"
    />
  );
}
