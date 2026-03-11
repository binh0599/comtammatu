"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { WifiOff, Printer, Settings, Usb, Volume2, VolumeOff, Clock, ChefHat, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { useKdsRealtime, type ConnectionStatus } from "./use-kds-realtime";
import { TicketCard } from "./ticket-card";
import { getStationTickets, recallTicket } from "./actions";
import { usePrinterForStation } from "@/hooks/use-printer-config";
import { generateKitchenTicketCommands } from "@/lib/printing/kitchen-ticket-commands";
import { printViaUsbAuto, printViaNetwork } from "@/lib/printing/escpos";
import { useSerialPrinter } from "../hooks/use-serial-printer";
import { buildKdsTicket } from "../lib/escpos";
import type { KdsTicket, TimingRule } from "./types";
import { InventoryPanel } from "./components/inventory-panel";
import type { MenuPortionInfo, IngredientOption, SupplierOption } from "./inventory-actions";
import { parseItems } from "./types";
import { toast } from "sonner";

function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  // Only show banner for actual connection problems, not initial connecting
  if (status === "connected" || status === "connecting") return null;

  const messages: Record<"disconnected" | "error", string> = {
    disconnected: "Mất kết nối — Đang kết nối lại...",
    error: "Lỗi kết nối — Đang thử lại...",
  };

  return (
    <div
      className="flex items-center justify-center gap-2 bg-yellow-100 border-b border-yellow-300 py-2 text-sm font-medium text-yellow-800"
      role="alert"
    >
      <WifiOff className="size-4" aria-hidden="true" />
      {messages[status]}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats bar — computed from current tickets
// ---------------------------------------------------------------------------

function StatsBar({ tickets }: { tickets: KdsTicket[] }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const preparingCount = tickets.filter((t) => t.status === "preparing").length;

  // Average wait time in minutes for all current tickets
  const avgWaitMin =
    tickets.length > 0
      ? Math.round(
          tickets.reduce(
            (sum, t) => sum + (now - new Date(t.created_at).getTime()) / 60_000,
            0,
          ) / tickets.length,
        )
      : 0;

  if (tickets.length === 0) return null;

  return (
    <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-4 py-2 text-sm sm:gap-6 sm:px-6">
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-yellow-500" />
        <span className="text-muted-foreground">Chờ:</span>
        <span className="font-bold">{pendingCount}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-muted-foreground">Đang làm:</span>
        <span className="font-bold">{preparingCount}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">TB chờ:</span>
        <span className="font-bold">{avgWaitMin}p</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main KDS Board
// ---------------------------------------------------------------------------

export function KdsBoard({
  stationId,
  stationName,
  initialTickets,
  timingRules,
  initialPortions,
  ingredients,
  suppliers,
}: {
  stationId: number;
  stationName: string;
  initialTickets: KdsTicket[];
  timingRules: TimingRule[];
  initialPortions: MenuPortionInfo[];
  ingredients: IngredientOption[];
  suppliers: SupplierOption[];
}) {
  const { tickets, connectionStatus } = useKdsRealtime(
    stationId,
    initialTickets,
    getStationTickets,
  );
  const { config: printerConfig } = usePrinterForStation(stationId);
  const serialPrinter = useSerialPrinter();

  const defaultRule = timingRules[0] ?? null;

  // Track ticket IDs that have already been printed or queued for auto-print
  const printedTicketIds = useRef(new Set(initialTickets.map((t) => t.id)));

  // --- Sound notification ---
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("kds-muted") === "true";
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track IDs that have already triggered sound
  const soundedTicketIds = useRef(new Set(initialTickets.map((t) => t.id)));

  function toggleMute() {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem("kds-muted", String(next));
      return next;
    });
  }

  // Lazy-init audio element
  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-order.wav");
    audioRef.current.volume = 0.8;
  }, []);

  // Detect new tickets → play sound (separate from auto-print to always play)
  useEffect(() => {
    if (isMuted) return;

    let hasNew = false;
    for (const ticket of tickets) {
      if (
        ticket.status === "pending" &&
        !soundedTicketIds.current.has(ticket.id)
      ) {
        soundedTicketIds.current.add(ticket.id);
        hasNew = true;
      }
    }

    if (hasNew && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Browser may block autoplay — ignore
      });
    }
  }, [tickets, isMuted]);

  // --- Recall toast handler ---
  const handleRecall = useCallback(
    async (ticketId: number, orderNumber: string) => {
      const result = await recallTicket(ticketId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Đã hoàn tác ${orderNumber}`);
      }
    },
    [],
  );

  const onBumpReady = useCallback(
    (ticketId: number, orderNumber: string) => {
      // Show recall toast for 10 seconds
      toast(`${orderNumber} đã ra món`, {
        duration: 10_000,
        action: {
          label: "Hoàn tác",
          onClick: () => handleRecall(ticketId, orderNumber),
        },
      });
    },
    [handleRecall],
  );

  /** Auto-print a ticket via Web Serial if connected, otherwise fall back to WebUSB/network */
  const autoPrintTicket = useCallback(
    (ticket: KdsTicket) => {
      const paperWidth = printerConfig?.paper_width_mm ?? 80;

      // Path 1: Web Serial API is connected — use it directly
      if (serialPrinter.status === "connected") {
        const items = parseItems(ticket.items);
        const serialCommands = buildKdsTicket({
          stationName,
          orderNumber: ticket.orders?.order_number ?? `#${ticket.order_id}`,
          tableNumber: ticket.orders?.tables?.number?.toString() ?? null,
          items: items.map((i) => ({
            quantity: i.quantity,
            name: i.menu_item_name + (i.variant_name ? ` - ${i.variant_name}` : ""),
            notes: i.notes ?? undefined,
            modifiers: i.modifiers,
          })),
          createdAt: ticket.created_at,
          paperWidth,
        });

        const delay = printerConfig?.print_delay_ms ?? 500;
        setTimeout(() => {
          serialPrinter
            .print(serialCommands)
            .catch((err) =>
              console.warn("KDS serial auto-print error:", err),
            );
        }, delay);
        return;
      }

      // Path 2: Fall back to WebUSB / network printing (existing logic)
      if (!printerConfig) return;
      const lineWidth = paperWidth === 58 ? 32 : 42;
      const commands = generateKitchenTicketCommands(ticket, stationName, lineWidth);
      const connConfig = printerConfig.connection_config;

      const printFn =
        printerConfig.type === "thermal_usb"
          ? () =>
              printViaUsbAuto(commands, {
                vendor_id: (connConfig.vendor_id as number) ?? 0,
                product_id: (connConfig.product_id as number) ?? 0,
                device_serial: (connConfig.device_serial as string) || undefined,
              })
          : () =>
              printViaNetwork(commands, {
                host: (connConfig.host as string) ?? "",
                port: (connConfig.port as number) ?? 9100,
                protocol: (connConfig.protocol as string) ?? "raw",
              });

      // Use setTimeout for print_delay_ms but don't tie it to effect cleanup
      setTimeout(() => {
        printFn()
          .then((result) => {
            if (!result.success) {
              console.warn(`KDS auto-print failed for ticket ${ticket.id}:`, result.error);
            }
          })
          .catch((err) =>
            console.warn("KDS auto-print error:", err),
          );
      }, printerConfig.print_delay_ms);
    },
    [printerConfig, stationName, serialPrinter.status, serialPrinter.print],
  );

  useEffect(() => {
    // Auto-print enabled via printer config OR serial printer is connected
    const hasAutoPrint = printerConfig?.auto_print && printerConfig.type !== "browser";
    const hasSerialAutoPrint = serialPrinter.status === "connected";

    if (!hasAutoPrint && !hasSerialAutoPrint) return;

    // Find new tickets that haven't been printed yet
    for (const ticket of tickets) {
      if (
        ticket.status === "pending" &&
        !printedTicketIds.current.has(ticket.id) &&
        ticket.orders // Wait for complete data with joined orders/tables
      ) {
        printedTicketIds.current.add(ticket.id);
        autoPrintTicket(ticket);
      }
    }
  }, [tickets, printerConfig, autoPrintTicket, serialPrinter.status]);

  return (
    <div className="flex h-screen flex-col">
      {/* Connection status banner */}
      <ConnectionBanner status={connectionStatus} />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <ChefHat className="size-6 text-primary hidden sm:block" aria-hidden="true" />
          <h1 className="text-lg font-bold text-foreground sm:text-2xl">{stationName}</h1>
          <span className="text-sm text-muted-foreground" role="status">
            {tickets.length} đơn
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Sound toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="gap-1"
            aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
            {isMuted ? (
              <VolumeOff className="size-4 text-muted-foreground" />
            ) : (
              <Volume2 className="size-4 text-green-600" />
            )}
          </Button>

          {printerConfig && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Printer className="size-3" aria-hidden="true" />
              {printerConfig.auto_print ? "Tự động in" : "Máy in sẵn sàng"}
            </Badge>
          )}
          {serialPrinter.isSupported && (
            <Button
              variant={serialPrinter.status === "connected" ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() =>
                serialPrinter.status === "connected"
                  ? serialPrinter.disconnect()
                  : serialPrinter.connect()
              }
              disabled={serialPrinter.status === "connecting"}
            >
              <Usb className="size-3.5" aria-hidden="true" />
              {serialPrinter.status === "connected"
                ? "Serial: Đã kết nối"
                : serialPrinter.status === "connecting"
                  ? "Đang kết nối..."
                  : serialPrinter.status === "error"
                    ? "Serial: Lỗi"
                    : "Kết nối Serial"}
            </Button>
          )}
          <div className="hidden gap-2 md:flex" role="group" aria-label="Chú thích thời gian">
            <span className="flex items-center gap-1 text-xs text-green-700">
              <span className="size-2 rounded-full bg-green-500" aria-hidden="true" />
              Bình thường
            </span>
            <span className="flex items-center gap-1 text-xs text-yellow-700">
              <span className="size-2 rounded-full bg-yellow-500" aria-hidden="true" />
              Gần trễ
            </span>
            <span className="flex items-center gap-1 text-xs text-red-700">
              <span className="size-2 rounded-full bg-red-500" aria-hidden="true" />
              Trễ
            </span>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-1" aria-label="Cài đặt máy in">
            <Link href="/kds/printer">
              <Settings className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Máy in</span>
            </Link>
          </Button>
          <LogoutButton className="rounded-lg border border-border px-3 py-1.5 text-sm" />
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar tickets={tickets} />

      {/* Inventory Panel */}
      <InventoryPanel
        initialPortions={initialPortions}
        ingredients={ingredients}
        suppliers={suppliers}
      />

      {/* Board */}
      <div className="flex-1 overflow-auto p-4">
        {tickets.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-2xl text-muted-foreground" role="status">
              Không có đơn hàng — Sẵn sàng!
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            aria-live="polite"
            aria-label="Danh sách đơn hàng"
          >
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                timingRule={defaultRule}
                printerConfig={printerConfig}
                stationName={stationName}
                serialPrint={
                  serialPrinter.status === "connected"
                    ? serialPrinter.print
                    : undefined
                }
                onBumpReady={onBumpReady}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
