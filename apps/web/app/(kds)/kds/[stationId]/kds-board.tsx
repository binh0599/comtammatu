"use client";

import { LogOut, WifiOff, Loader2 } from "lucide-react";
import { logout } from "@/app/login/actions";
import { useKdsRealtime, type ConnectionStatus } from "./use-kds-realtime";
import { TicketCard } from "./ticket-card";
import { getStationTickets } from "./actions";

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
      className="flex items-center justify-center gap-2 bg-yellow-600 py-1.5 text-sm font-medium text-black"
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

  const defaultRule = timingRules[0] ?? null;

  return (
    <div className="flex h-screen flex-col">
      {/* Connection status banner */}
      <ConnectionBanner status={connectionStatus} />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-6 py-3">
        <h1 className="text-2xl font-bold text-white">{stationName}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400" role="status">
            {tickets.length} đơn đang chờ
          </span>
          <div className="flex gap-2" aria-label="Huyền tích thời gian">
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
              Bình thường
            </span>
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <span className="h-2 w-2 rounded-full bg-yellow-500" aria-hidden="true" />
              Cảnh báo
            </span>
            <span className="flex items-center gap-1 text-xs text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              Trễ
            </span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-red-500 hover:text-red-400"
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
            <p className="text-2xl text-gray-500" role="status">
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
