"use client";

import Link from "next/link";
import { Clock, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@comtammatu/shared";

interface SessionInfo {
  id: number;
  opening_amount: number;
  opened_at: string;
  cashier_name: string;
  terminal_name: string;
}

export function SessionBar({ session }: { session: SessionInfo }) {
  const openedAt = new Date(session.opened_at);
  const elapsed = Math.floor(
    (Date.now() - openedAt.getTime()) / (1000 * 60)
  );
  const hours = Math.floor(elapsed / 60);
  const minutes = elapsed % 60;

  return (
    <div className="bg-muted/50 flex items-center gap-4 border-b px-4 py-2">
      <Badge variant="default" className="shrink-0">
        Ca đang mở
      </Badge>
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <DollarSign className="h-3.5 w-3.5" />
        <span>{formatPrice(session.opening_amount)}</span>
      </div>
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Clock className="h-3.5 w-3.5" />
        <span>
          {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
        </span>
      </div>
      <span className="text-muted-foreground text-sm">
        {session.cashier_name} · {session.terminal_name}
      </span>
      <div className="flex-1" />
      <Button variant="outline" size="sm" asChild>
        <Link href="/pos/session">Quản lý ca</Link>
      </Button>
    </div>
  );
}
