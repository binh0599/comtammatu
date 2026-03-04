"use client";

import { useEffect, useRef } from "react";
import { WifiOff, Loader2, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import { useKdsRealtime, type ConnectionStatus } from "./use-kds-realtime";
import { TicketCard } from "./ticket-card";
import { getStationTickets } from "./actions";
import { usePrinterForStation } from "@/hooks/use-printer-config";
import { generateKitchenTicketCommands } from "@/lib/printing/kitchen-ticket-commands";
import { printViaUsbAuto, printViaNetwork } from "@/lib/printing/escpos";
import type { KdsTicket, TimingRule } from "./types";

function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  if (status === "connected") return null;

  const messages: Record<Exclude<ConnectionStatus, "connected">, string> = {
    connecting: "Đang kết nối...",
    disconnected: "Mất kết nối — Đang kết nối lại...",
    error: "Lỗi kết nối — Đang thử lại...",
  };

  return (
    <div
      className="flex items-center justify-center gap-2 bg-yellow-100 border-b border-yellow-300 py-1.5 text-sm font-medium text-yellow-800"
      role="alert"
    >
      {status === "connecting" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
      {messages[status]}
    </div>
  );
}

export function KdsBoard({
  stationId,
  stationName,
  initialTickets,
  timingRules,
}: {
  stationId: number;
  stationName: string;
  initialTickets: KdsTicket[];
  timingRules: TimingRule[];
}) {
  const { tickets, connectionStatus } = useKdsRealtime(
    stationId,
    initialTickets,
    getStationTickets,
  );
  const { config: printerConfig } = usePrinterForStation(stationId);

  const defaultRule = timingRules[0] ?? null;

  // Track known ticket IDs to detect new arrivals for auto-print
  const knownTicketIds = useRef(new Set(initialTickets.map((t) => t.id)));
  const printTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!printerConfig?.auto_print) return;
    if (printerConfig.type === "browser") return; // Browser auto-print not supported on KDS

    // Find new tickets that weren't in the previous set
    const newTickets = tickets.filter(
      (t) => t.status === "pending" && !knownTicketIds.current.has(t.id),
    );

    // Update known set
    for (const t of tickets) {
      knownTicketIds.current.add(t.id);
    }

    // Auto-print each new ticket
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const ticket of newTickets) {
      const commands = generateKitchenTicketCommands(ticket, stationName);
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

      const timer = setTimeout(() => {
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
      timers.push(timer);
    }
    printTimersRef.current = timers;

    return () => {
      for (const t of printTimersRef.current) {
        clearTimeout(t);
      }
      printTimersRef.current = [];
    };
  }, [tickets, printerConfig, stationName]);

  return (
    <div className="flex h-screen flex-col">
      {/* Connection status banner */}
      <ConnectionBanner status={connectionStatus} />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h1 className="text-2xl font-bold text-foreground">{stationName}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground" role="status">
            {tickets.length} đơn đang chờ
          </span>
          {printerConfig && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Printer className="size-3" />
              {printerConfig.auto_print ? "Tự động in" : "Máy in sẵn sàng"}
            </Badge>
          )}
          <div className="flex gap-2" aria-label="Chú thích màu">
            <span className="flex items-center gap-1 text-xs text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
              Bình thường
            </span>
            <span className="flex items-center gap-1 text-xs text-yellow-700">
              <span className="h-2 w-2 rounded-full bg-yellow-500" aria-hidden="true" />
              Gần trễ
            </span>
            <span className="flex items-center gap-1 text-xs text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              Trễ
            </span>
          </div>
          <LogoutButton className="rounded-lg border border-border px-3 py-1.5 text-sm" />
        </div>
      </div>

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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
