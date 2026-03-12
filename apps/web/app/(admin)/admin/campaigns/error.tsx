"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function CampaignsError({
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
      title="Lỗi trang Chiến dịch"
      homeHref="/admin"
      variant="card"
    />
  );
}
