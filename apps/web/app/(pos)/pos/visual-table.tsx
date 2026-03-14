"use client";

import { cn } from "@comtammatu/ui";
import { getTableStatusLabel, getOrderStatusLabel, formatPrice } from "@comtammatu/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveOrder {
  id: number;
  order_number: string;
  status: string;
  total: number;
  item_count: number;
  guest_count?: number;
  sub_order_index?: number;
}

interface VisualTableProps {
  tableNumber: number;
  capacity: number;
  status: string;
  activeOrders: ActiveOrder[];
  isClickable: boolean;
  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Status colors
// ---------------------------------------------------------------------------

const tableStatusFill: Record<string, string> = {
  available: "fill-green-100 stroke-green-500",
  occupied: "fill-red-100 stroke-red-500",
  reserved: "fill-yellow-100 stroke-yellow-500",
  cleaning: "fill-gray-100 stroke-gray-400",
};

const tableStatusBg: Record<string, string> = {
  available: "bg-green-50 border-green-300",
  occupied: "bg-red-50 border-red-300",
  reserved: "bg-yellow-50 border-yellow-300",
  cleaning: "bg-gray-50 border-gray-300",
};

const occupiedChairFill = "fill-orange-300 stroke-orange-600";
const emptyChairFill: Record<string, string> = {
  available: "fill-green-100 stroke-green-400",
  occupied: "fill-gray-100 stroke-gray-300",
  reserved: "fill-yellow-100 stroke-yellow-400",
  cleaning: "fill-gray-100 stroke-gray-300",
};

const orderStatusDot: Record<string, string> = {
  draft: "bg-gray-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500",
  ready: "bg-green-500",
  served: "bg-purple-500",
};

// ---------------------------------------------------------------------------
// Chair positions around a table (supports 2, 4, 6, 8 seats)
// ---------------------------------------------------------------------------

function getChairPositions(
  capacity: number
): Array<{ cx: number; cy: number; rx: number; ry: number }> {
  // SVG viewBox is 120x120, table centered at 60,60
  const positions: Array<{ cx: number; cy: number; rx: number; ry: number }> = [];

  if (capacity <= 2) {
    // 2 chairs: top and bottom
    positions.push({ cx: 60, cy: 14, rx: 12, ry: 8 }); // top
    positions.push({ cx: 60, cy: 106, rx: 12, ry: 8 }); // bottom
  } else if (capacity <= 4) {
    // 4 chairs: top, bottom, left, right
    positions.push({ cx: 60, cy: 14, rx: 12, ry: 8 }); // top
    positions.push({ cx: 60, cy: 106, rx: 12, ry: 8 }); // bottom
    positions.push({ cx: 14, cy: 60, rx: 8, ry: 12 }); // left
    positions.push({ cx: 106, cy: 60, rx: 8, ry: 12 }); // right
  } else if (capacity <= 6) {
    // 6 chairs: 2 top, 2 bottom, 1 left, 1 right
    positions.push({ cx: 42, cy: 14, rx: 12, ry: 8 }); // top-left
    positions.push({ cx: 78, cy: 14, rx: 12, ry: 8 }); // top-right
    positions.push({ cx: 42, cy: 106, rx: 12, ry: 8 }); // bottom-left
    positions.push({ cx: 78, cy: 106, rx: 12, ry: 8 }); // bottom-right
    positions.push({ cx: 14, cy: 60, rx: 8, ry: 12 }); // left
    positions.push({ cx: 106, cy: 60, rx: 8, ry: 12 }); // right
  } else {
    // 8 chairs: 2 top, 2 bottom, 2 left, 2 right
    positions.push({ cx: 42, cy: 14, rx: 12, ry: 8 }); // top-left
    positions.push({ cx: 78, cy: 14, rx: 12, ry: 8 }); // top-right
    positions.push({ cx: 42, cy: 106, rx: 12, ry: 8 }); // bottom-left
    positions.push({ cx: 78, cy: 106, rx: 12, ry: 8 }); // bottom-right
    positions.push({ cx: 14, cy: 42, rx: 8, ry: 12 }); // left-top
    positions.push({ cx: 14, cy: 78, rx: 8, ry: 12 }); // left-bottom
    positions.push({ cx: 106, cy: 42, rx: 8, ry: 12 }); // right-top
    positions.push({ cx: 106, cy: 78, rx: 8, ry: 12 }); // right-bottom
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Compute how many chairs are occupied across all orders
// ---------------------------------------------------------------------------

function getOccupiedSeats(orders: ActiveOrder[]): number {
  return orders.reduce((sum, o) => sum + (o.guest_count ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Visual Table Component
// ---------------------------------------------------------------------------

export function VisualTable({
  tableNumber,
  capacity,
  status,
  activeOrders,
  isClickable,
  onClick,
}: VisualTableProps) {
  const chairs = getChairPositions(capacity);
  const occupiedSeats = getOccupiedSeats(activeOrders);
  const orderCount = activeOrders.length;

  // Build sub-order labels (Bàn 1.1, Bàn 1.2, etc.)
  const subOrderLabels = activeOrders.map((o, i) => ({
    label: orderCount > 1 ? `${tableNumber}.${i + 1}` : null,
    order: o,
  }));

  // Build aria label
  const orderLabels = activeOrders.map((o) => o.order_number).join(", ");

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      aria-label={`Bàn ${tableNumber}, ${capacity} chỗ, ${getTableStatusLabel(status)}${occupiedSeats > 0 ? `, ${occupiedSeats}/${capacity} khách` : ""}${orderLabels ? `, ${orderLabels}` : ""}`}
      className={cn(
        "group relative flex flex-col items-center rounded-xl border p-2 transition-all",
        tableStatusBg[status] ?? "bg-gray-50 border-gray-300",
        isClickable &&
          "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !isClickable && "cursor-default opacity-60"
      )}
    >
      {/* SVG Table + Chairs */}
      <svg viewBox="0 0 120 120" className="h-20 w-20 sm:h-24 sm:w-24" aria-hidden="true">
        {/* Chairs */}
        {chairs.map((pos, i) => {
          const isOccupied = i < occupiedSeats;
          const fillClass = isOccupied
            ? occupiedChairFill
            : (emptyChairFill[status] ?? "fill-gray-100 stroke-gray-300");
          return (
            <ellipse
              key={i}
              cx={pos.cx}
              cy={pos.cy}
              rx={pos.rx}
              ry={pos.ry}
              className={cn(fillClass, "stroke-[1.5] transition-colors")}
            />
          );
        })}

        {/* Table surface */}
        <rect
          x="28"
          y="28"
          width="64"
          height="64"
          rx="8"
          className={cn(
            tableStatusFill[status] ?? "fill-gray-100 stroke-gray-400",
            "stroke-[2] transition-colors"
          )}
        />

        {/* Table number text */}
        <text
          x="60"
          y="56"
          textAnchor="middle"
          className="fill-current text-[14px] font-bold"
          style={{ fill: "currentColor" }}
        >
          {tableNumber}
        </text>

        {/* Guest count (if occupied) */}
        {occupiedSeats > 0 && (
          <text
            x="60"
            y="72"
            textAnchor="middle"
            className="text-[10px]"
            style={{ fill: "currentColor", opacity: 0.7 }}
          >
            {occupiedSeats}/{capacity}
          </text>
        )}
      </svg>

      {/* Table label */}
      <span className="mt-1 text-xs font-bold leading-tight">Bàn {tableNumber}</span>

      {/* Status */}
      <span className="text-[10px] opacity-70 leading-tight">{getTableStatusLabel(status)}</span>

      {/* Sub-order indicators for split orders */}
      {orderCount > 0 && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5">
          {subOrderLabels.map(({ label, order }) => (
            <div
              key={order.id}
              className="flex items-center gap-0.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-medium shadow-sm"
              title={`${order.order_number} · ${getOrderStatusLabel(order.status)} · ${formatPrice(order.total)}${order.guest_count ? ` · ${order.guest_count} khách` : ""}`}
            >
              <span
                className={cn(
                  "inline-block size-1.5 rounded-full",
                  orderStatusDot[order.status] ?? "bg-gray-400"
                )}
              />
              {label ? <span>{label}</span> : <span>{order.item_count} món</span>}
            </div>
          ))}
        </div>
      )}

      {/* Empty seats indicator when partially occupied */}
      {status === "occupied" && occupiedSeats < capacity && (
        <span className="mt-0.5 text-[9px] text-green-600 font-medium">
          +{capacity - occupiedSeats} chỗ trống
        </span>
      )}
    </button>
  );
}
