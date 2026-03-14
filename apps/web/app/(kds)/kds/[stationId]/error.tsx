"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function KdsStationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} title="KDS gặp lỗi" variant="minimal" />;
}
