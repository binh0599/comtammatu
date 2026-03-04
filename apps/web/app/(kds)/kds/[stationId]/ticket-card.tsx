"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bumpTicket } from "./actions";
import { KitchenTicketPrinter } from "./components/kitchen-ticket-printer";

interface TicketItemModifier {
  name: string;
  price?: number;
  options?: string[];
}

interface TicketItem {
  order_item_id: number;
  menu_item_id: number;
  menu_item_name: string;
  quantity: number;
  modifiers: TicketItemModifier[] | null;
  notes: string | null;
  variant_name: string | null;
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
  if (!rule) return { border: "border-green-500", bg: "bg-green-50", label: "Bình thường" };

  if (rule.critical_min && elapsedMinutes >= rule.critical_min) {
    return { border: "border-red-500", bg: "bg-red-50", label: "Trễ" };
  }
  if (rule.warning_min && elapsedMinutes >= rule.warning_min) {
    return { border: "border-yellow-500", bg: "bg-yellow-50", label: "Gần trễ" };
  }
  return { border: "border-green-500", bg: "bg-green-50", label: "Bình thường" };
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
    <article
      role="article"
      aria-label={`Đơn hàng ${orderNumber}${tableNumber ? ` bàn ${tableNumber}` : ""}, ${colors.label}, ${elapsed} phút`}
      className={cn(
        "flex flex-col rounded-xl border-2 p-4 transition-all",
        colors.border,
        colors.bg
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-lg font-bold text-foreground">{orderNumber}</p>
            {tableNumber && (
              <p className="text-sm text-muted-foreground">Bàn {tableNumber}</p>
            )}
          </div>
          {(ticket.status === "pending" || ticket.status === "preparing") && (
            <KitchenTicketPrinter ticket={ticket} />
          )}
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              elapsed >= (timingRule?.critical_min ?? 999)
                ? "text-red-600"
                : elapsed >= (timingRule?.warning_min ?? 999)
                  ? "text-yellow-600"
                  : "text-green-600"
            )}
          >
            {elapsed}m
          </p>
          <span
            className={cn(
              "mt-1 inline-block rounded px-2 py-1 text-xs font-medium",
              elapsed >= (timingRule?.critical_min ?? 999)
                ? "bg-red-100 text-red-800"
                : elapsed >= (timingRule?.warning_min ?? 999)
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
            )}
            aria-hidden="false"
          >
            {colors.label}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col">
            <div className="flex gap-2 text-base">
              <span className="font-bold text-foreground">{item.quantity}×</span>
              <span className="text-foreground">
                {item.menu_item_name}
                {item.variant_name && ` - ${item.variant_name}`}
              </span>
            </div>
            {(item.modifiers || item.notes) && (
              <div className="ml-6 flex flex-col gap-1 text-sm">
                {item.modifiers?.map((m, mIdx) => (
                  <span key={mIdx} className="text-muted-foreground">
                    + {m.name}{m.options ? `: ${m.options.join(", ")}` : m.price ? ` (+${new Intl.NumberFormat("vi-VN").format(m.price)}đ)` : ""}
                  </span>
                ))}
                {item.notes && (
                  <span className="font-medium italic text-destructive">
                    * {item.notes}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bump button */}
      <Button
        onClick={handleBump}
        disabled={isPending}
        size="lg"
        aria-label={ticket.status === "pending" ? `Bắt đầu chuẩn bị ${orderNumber}` : `Hoàn thành ${orderNumber}`}
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
    </article>
  );
}
