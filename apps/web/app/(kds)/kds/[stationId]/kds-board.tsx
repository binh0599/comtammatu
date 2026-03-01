"use client";

import { useKdsRealtime } from "./use-kds-realtime";
import { TicketCard } from "./ticket-card";

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
  const tickets = useKdsRealtime(stationId, initialTickets);

  // Use first timing rule as default (simplification for MVP)
  const defaultRule = timingRules[0] ?? null;

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-6 py-3">
        <h1 className="text-2xl font-bold text-white">{stationName}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {tickets.length} đơn đang chờ
          </span>
          <div className="flex gap-2">
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Bình thường
            </span>
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Cảnh báo
            </span>
            <span className="flex items-center gap-1 text-xs text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Trễ
            </span>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-4">
        {tickets.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-2xl text-gray-500">
              Không có đơn hàng — Sẵn sàng!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
