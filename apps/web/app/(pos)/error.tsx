"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function PosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[60vh]">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h2 className="text-lg font-semibold">Có lỗi xảy ra</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {error.digest ? "Lỗi hệ thống. Vui lòng thử lại sau." : error.message}
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
