"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-lg font-semibold">Có lỗi xảy ra</h2>
          <p className="text-sm text-muted-foreground">{error.digest ? "Lỗi hệ thống. Vui lòng thử lại sau." : error.message}</p>
          <div className="flex gap-3">
            <Button onClick={reset}>Thử lại</Button>
            <Button variant="outline" asChild>
              <Link href="/admin">Về trang chủ</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
