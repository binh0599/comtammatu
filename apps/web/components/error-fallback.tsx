"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button, Card, CardContent } from "@comtammatu/ui";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Context-specific error title (default: "Có lỗi xảy ra") */
  title?: string;
  /** Link to navigate home; omit to hide the home button */
  homeHref?: string;
  /** Label for the home button (default: "Về trang chủ") */
  homeLabel?: string;
  /** "card" wraps in a Card, "inline" uses a destructive banner, "minimal" is centered text */
  variant?: "card" | "inline" | "minimal";
}

export function ErrorFallback({
  error,
  reset,
  title = "Có lỗi xảy ra",
  homeHref,
  homeLabel = "Về trang chủ",
  variant = "minimal",
}: ErrorFallbackProps) {
  const message = error.digest
    ? "Lỗi hệ thống. Vui lòng thử lại sau."
    : error.message;

  if (variant === "inline") {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive mb-1">{title}</p>
          <p className="text-xs text-muted-foreground mb-3">{message}</p>
          <Button size="sm" variant="outline" onClick={reset}>
            Tải lại
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <div className="flex gap-3">
              <Button onClick={reset}>Thử lại</Button>
              {homeHref && (
                <Button variant="outline" asChild>
                  <Link href={homeHref}>{homeLabel}</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // minimal
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[60vh]">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {message}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Thử lại</Button>
        {homeHref && (
          <Button variant="outline" asChild>
            <Link href={homeHref}>{homeLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
