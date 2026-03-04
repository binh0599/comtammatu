"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function MenuDetailError({
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
      title="Không thể tải chi tiết menu"
      homeHref="/admin/menu"
      homeLabel="Danh sách menu"
      variant="card"
    />
  );
}
