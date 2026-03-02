"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-4 min-h-[60vh]">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h2 className="font-semibold">Co loi xay ra</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={reset} className="w-full">
            Thu lai
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
