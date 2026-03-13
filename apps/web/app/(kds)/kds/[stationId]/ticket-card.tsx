"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { bumpTicket } from "./actions";
import { KitchenTicketPrinter } from "./components/kitchen-ticket-printer";
import { buildKdsTicket } from "../lib/escpos";
import type { PrinterConfig } from "@/hooks/use-printer-config";
import { getTimingColor, parseItems, type KdsTicket, type TimingRule } from "./types";
import { Button, cn } from "@comtammatu/ui";

export function TicketCard({
  ticket,
  timingRule,
  printerConfig,
  stationName,
  serialPrint,
  onBumpReady,
}: {
  ticket: KdsTicket;
  timingRule: TimingRule | null;
  printerConfig?: PrinterConfig | null;
  stationName?: string;
  /** If provided, Web Serial printing is available for this ticket */
  serialPrint?: (data: Uint8Array) => Promise<void>;
  /** Called after bump to "ready" — parent shows recall toast */
  onBumpReady?: (ticketId: number, orderNumber: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const [isNew, setIsNew] = useState(false);

  const items = parseItems(ticket.items);
  const orderNumber = ticket.orders?.order_number ?? `#${ticket.order_id}`;
  const tableNumber = ticket.orders?.tables?.number;

  // Flash animation for new tickets
  useEffect(() => {
    const age = Date.now() - new Date(ticket.created_at).getTime();
    if (age < 5_000) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 2_000);
      return () => clearTimeout(timer);
    }
  }, [ticket.created_at]);

  /** Print this ticket via Web Serial API */
  const handleSerialPrint = useCallback(async () => {
    if (!serialPrint) return;
    try {
      const paperWidth = printerConfig?.paper_width_mm ?? 80;
      const commands = buildKdsTicket({
        stationName: stationName ?? "Bep",
        orderNumber,
        tableNumber: tableNumber?.toString() ?? null,
        items: items.map((i) => ({
          quantity: i.quantity,
          name: i.menu_item_name + (i.variant_name ? ` - ${i.variant_name}` : ""),
          notes: i.notes ?? undefined,
          modifiers: i.modifiers,
        })),
        createdAt: ticket.created_at,
        paperWidth,
      });
      await serialPrint(commands);
      toast.success("Đã in phiếu bếp");
    } catch (err) {
      console.error("Serial print error:", err);
      toast.error("Lỗi in phiếu bếp qua Serial");
    }
  }, [serialPrint, printerConfig, stationName, orderNumber, tableNumber, items, ticket.created_at]);

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

  function handleBump(status: "preparing" | "ready") {
    startTransition(async () => {
      const result = await bumpTicket(ticket.id, status);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (status === "ready" && onBumpReady) {
        onBumpReady(ticket.id, orderNumber);
      }
    });
  }

  return (
    <article
      aria-label={`Đơn hàng ${orderNumber}${tableNumber ? ` bàn ${tableNumber}` : ""}, ${colors.label}, ${elapsed} phút`}
      className={cn(
        "flex flex-col rounded-xl border-2 p-4 transition-all",
        colors.border,
        colors.bg,
        isNew && "animate-pulse ring-2 ring-blue-400",
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
          {/* Status badge for preparing */}
          {ticket.status === "preparing" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              <span className="size-1.5 rounded-full bg-orange-500 animate-pulse" />
              Đang làm
            </span>
          )}
          {(ticket.status === "pending" || ticket.status === "preparing") && (
            <>
              <KitchenTicketPrinter
                ticket={ticket}
                stationName={stationName}
                printerConfig={printerConfig}
                preferThermal={!!printerConfig && printerConfig.type !== "browser"}
              />
              {serialPrint && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSerialPrint}
                  title="In qua Serial"
                  aria-label={`In phiếu bếp qua Serial ${orderNumber}`}
                  className="size-11"
                >
                  <Printer className="size-4" aria-hidden="true" />
                </Button>
              )}
            </>
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

      {/* Action buttons — preparing + ready */}
      <div className="mt-4 flex gap-2">
        {ticket.status === "pending" && (
          <Button
            onClick={() => handleBump("preparing")}
            disabled={isPending}
            size="lg"
            aria-label={`Đang làm ${orderNumber}`}
            className="min-h-[56px] flex-1 bg-orange-500 text-base font-bold hover:bg-orange-600"
          >
            {isPending ? "..." : "ĐANG LÀM"}
          </Button>
        )}
        <Button
          onClick={() => handleBump("ready")}
          disabled={isPending}
          size="lg"
          aria-label={`Đã ra món ${orderNumber}`}
          className={cn(
            "min-h-[56px] bg-green-600 text-base font-bold hover:bg-green-700",
            ticket.status === "pending" ? "flex-1" : "w-full",
          )}
        >
          {isPending ? "ĐANG CẬP NHẬT..." : "ĐÃ RA MÓN"}
        </Button>
      </div>
    </article>
  );
}
