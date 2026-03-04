"use client";

import { useEffect, useRef } from "react";
import { LogOut, WifiOff, Loader2, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { logout } from "@/app/login/actions";
import { useKdsRealtime, type ConnectionStatus } from "./use-kds-realtime";
import { TicketCard } from "./ticket-card";
import { getStationTickets } from "./actions";
import { usePrinterForStation } from "@/hooks/use-printer-config";
import { generateKitchenTicketCommands } from "@/lib/printing/kitchen-ticket-commands";
import { printViaUsb, printViaNetwork } from "@/lib/printing/escpos";

interface KdsTicket {
  id: number;
  order_id: number;
  station_id: number;
  status: string;
  items: unknown;
  priority: number | null;
  color_code: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  orders: {
    order_number: string;
    table_id: number | null;
    tables: { number: number } | null;
  } | null;
}

interface TimingRule {
  category_id: number;
  prep_time_min: number;
  warning_min: number | null;
  critical_min: number | null;
}

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
    for (const ticket of newTickets) {
      const commands = generateKitchenTicketCommands(ticket, stationName);
      const connConfig = printerConfig.connection_config;

      const printFn =
        printerConfig.type === "thermal_usb"
          ? () =>
              printViaUsb(commands, {
                vendor_id: (connConfig.vendor_id as number) ?? 0,
                product_id: (connConfig.product_id as number) ?? 0,
              })
          : () =>
              printViaNetwork(commands, {
                host: (connConfig.host as string) ?? "",
                port: (connConfig.port as number) ?? 9100,
                protocol: (connConfig.protocol as string) ?? "raw",
              });

      // Fire and forget — don't block KDS
      setTimeout(() => {
        printFn().catch((err) =>
          console.warn("KDS auto-print failed:", err),
        );
      }, printerConfig.print_delay_ms);
    }
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
          <div className="flex gap-2" aria-label="Huyền tích thời gian">
            <span className="flex items-center gap-1 text-xs text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
              Bình thường
            </span>
            <span className="flex items-center gap-1 text-xs text-yellow-700">
              <span className="h-2 w-2 rounded-full bg-yellow-500" aria-hidden="true" />
              Cảnh báo
            </span>
            <span className="flex items-center gap-1 text-xs text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              Trễ
            </span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-red-400 hover:text-red-600"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
              Thoát
            </button>
          </form>
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
