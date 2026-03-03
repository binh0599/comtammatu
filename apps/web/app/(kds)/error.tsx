"use client";

import { Button } from "@/components/ui/button";

export default function KdsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-screen bg-background text-foreground p-8">
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center max-w-md">
        <h2 className="text-lg font-semibold text-destructive mb-2">
          KDS gặp lỗi
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{error.digest ? "Lỗi hệ thống. Vui lòng thử lại sau." : error.message}</p>
        <Button onClick={reset}>Thử lại</Button>
      </div>
    </div>
  );
}
