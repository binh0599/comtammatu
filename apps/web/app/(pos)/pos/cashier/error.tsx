"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function CashierError({
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
      title="Không thể tải máy thu ngân"
      variant="inline"
    />
  );
}
