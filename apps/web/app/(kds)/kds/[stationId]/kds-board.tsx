"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { WifiOff, Printer, Settings, Usb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { useKdsRealtime, type ConnectionStatus } from "./use-kds-realtime";
import { TicketCard } from "./ticket-card";
import { getStationTickets } from "./actions";
import { usePrinterForStation } from "@/hooks/use-printer-config";
import { generateKitchenTicketCommands } from "@/lib/printing/kitchen-ticket-commands";
import { printViaUsbAuto, printViaNetwork } from "@/lib/printing/escpos";
import { useSerialPrinter } from "../hooks/use-serial-printer";
import { buildKdsTicket } from "../lib/escpos";
import type { KdsTicket, TimingRule } from "./types";
import { InventoryPanel } from "./components/inventory-panel";
import type { MenuPortionInfo, IngredientOption, SupplierOption } from "./inventory-actions";
import { parseItems } from "./types";

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
      <WifiOff className="size-4" />
      {messages[status]}
    </div>
  );
}

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
          <h1 className="text-lg font-bold text-foreground sm:text-2xl">{stationName}</h1>
          <span className="text-sm text-muted-foreground" role="status">
            {tickets.length} đơn
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {printerConfig && (
            <Badge variant="outline" className="hidden gap-1 text-xs sm:flex">
              <Printer className="size-3" />
              {printerConfig.auto_print ? "Tu dong in" : "May in san sang"}
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
              <Usb className="size-3.5" />
              {serialPrinter.status === "connected"
                ? "Serial: Da ket noi"
                : serialPrinter.status === "connecting"
                  ? "Dang ket noi..."
                  : serialPrinter.status === "error"
                    ? "Serial: Loi"
                    : "Ket noi Serial"}
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
