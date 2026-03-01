"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bumpTicket } from "./actions";

interface TicketItem {
  name: string;
  quantity: number;
}

interface TimingRule {
  prep_time_min: number;
  warning_min: number | null;
  critical_min: number | null;
}

interface KdsTicket {
  id: number;
  order_id: number;
  status: string;
  items: unknown;
  created_at: string;
  accepted_at: string | null;
  orders: {
    order_number: string;
    table_id: number | null;
    tables: { number: number } | null;
  } | null;
}

function parseItems(items: unknown): TicketItem[] {
  if (Array.isArray(items)) {
    return items as TicketItem[];
  }
  return [];
}

function getTimingColor(elapsedMinutes: number, rule: TimingRule | null) {
  if (!rule) return { border: "border-green-500", bg: "bg-green-950" };

  if (rule.critical_min && elapsedMinutes >= rule.critical_min) {
    return { border: "border-red-500", bg: "bg-red-950" };
  }
  if (rule.warning_min && elapsedMinutes >= rule.warning_min) {
    return { border: "border-yellow-500", bg: "bg-yellow-950" };
  }
  return { border: "border-green-500", bg: "bg-green-950" };
}

export function TicketCard({
  ticket,
  timingRule,
}: {
  ticket: KdsTicket;
  timingRule: TimingRule | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);

  const items = parseItems(ticket.items);
  const orderNumber = ticket.orders?.order_number ?? `#${ticket.order_id}`;
  const tableNumber = ticket.orders?.tables?.number;

  // Update elapsed timer every 10 seconds
  useEffect(() => {
    function updateElapsed() {
      const created = new Date(ticket.created_at).getTime();
      const now = Date.now();
      setElapsed(Math.floor((now - created) / (1000 * 60)));
    }

    updateElapsed();
    const interval = setInterval(updateElapsed, 10000);
    return () => clearInterval(interval);
  }, [ticket.created_at]);

  const colors = getTimingColor(elapsed, timingRule);

  function handleBump() {
    const newStatus =
      ticket.status === "pending" ? "preparing" : "ready";

    startTransition(async () => {
      await bumpTicket(ticket.id, newStatus as "preparing" | "ready");
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border-2 p-4 transition-all",
        colors.border,
        colors.bg
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold">{orderNumber}</p>
          {tableNumber && (
            <p className="text-sm text-gray-400">Bàn {tableNumber}</p>
          )}
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              elapsed >= (timingRule?.critical_min ?? 999)
                ? "text-red-400"
                : elapsed >= (timingRule?.warning_min ?? 999)
                  ? "text-yellow-400"
                  : "text-green-400"
            )}
          >
            {elapsed}m
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 text-base">
            <span className="font-bold text-white">{item.quantity}×</span>
            <span className="text-gray-200">{item.name}</span>
          </div>
        ))}
      </div>

      {/* Bump button */}
      <Button
        onClick={handleBump}
        disabled={isPending}
        size="lg"
        className={cn(
          "mt-4 min-h-[64px] w-full text-lg font-bold",
          ticket.status === "pending"
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-green-600 hover:bg-green-700"
        )}
      >
        {isPending
          ? "..."
          : ticket.status === "pending"
            ? "BẮT ĐẦU"
            : "XONG"}
      </Button>
    </div>
  );
}
