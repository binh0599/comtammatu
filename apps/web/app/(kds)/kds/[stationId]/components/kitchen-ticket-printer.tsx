"use client";

import { useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@comtammatu/shared";
import { parseItems, type KdsTicket } from "../types";

// ===== Component =====

interface KitchenTicketPrinterProps {
  ticket: KdsTicket;
  stationName?: string;
  onPrintComplete?: () => void;
  autoPrint?: boolean;
}

export function KitchenTicketPrinter({
  ticket,
  stationName,
  onPrintComplete,
  autoPrint = false,
}: KitchenTicketPrinterProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const orderNumber = ticket.orders?.order_number ?? `#${ticket.order_id}`;
  const tableNumber = ticket.orders?.tables?.number;
  const items = parseItems(ticket.items);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `KitchenTicket_${orderNumber}`,
    onAfterPrint: () => {
      if (onPrintComplete) onPrintComplete();
    },
  });

  // Auto-print on mount (U1 fix: moved from render body to useEffect)
  useEffect(() => {
    if (!autoPrint) return;
    const timer = setTimeout(() => {
      handlePrint();
    }, 500);
    return () => clearTimeout(timer);
  }, [autoPrint]); // handlePrint is stable from useReactToPrint

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handlePrint()}
        title="In phiếu bếp"
        className="size-8"
      >
        <Printer className="size-4" />
      </Button>

      {/* Hidden Print Content — 80mm thermal layout */}
      <div className="hidden">
        <div
          ref={contentRef}
          className="print:block bg-white text-black p-2 text-[12px] leading-tight font-mono w-[80mm] mx-auto print:m-0 print:p-1"
        >
          {/* Header */}
          <div className="text-center mb-3">
            <div className="text-xl font-bold uppercase tracking-wide">
              ĐƠN BẾP
            </div>
            {stationName && (
              <div className="text-[10px] text-gray-600">{stationName}</div>
            )}
          </div>

          <div className="border-t-2 border-black border-dashed mb-2" />

          {/* Order Info */}
          <div className="mb-2 space-y-0.5">
            <div className="flex justify-between">
              <span>Mã đơn:</span>
              <span className="font-bold text-[14px]">{orderNumber}</span>
            </div>
            {tableNumber != null && (
              <div className="flex justify-between">
                <span>Bàn:</span>
                <span className="font-bold text-[16px]">
                  {tableNumber}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[10px]">
              <span>Thời gian:</span>
              <span>{formatDateTime(ticket.created_at)}</span>
            </div>
          </div>

          <div className="border-t-2 border-black border-dashed mb-2" />

          {/* Items */}
          <div className="space-y-2 mb-2">
            {items.map((item, idx) => (
              <div key={idx}>
                {/* Main item line: qty × name */}
                <div className="flex gap-1 text-[14px] font-bold">
                  <span className="shrink-0">{item.quantity}×</span>
                  <span>
                    {item.menu_item_name}
                    {item.variant_name && (
                      <span className="font-normal text-[12px]">
                        {" "}— {item.variant_name}
                      </span>
                    )}
                  </span>
                </div>

                {/* Modifiers */}
                {item.modifiers?.map((m, mIdx) => (
                  <div key={mIdx} className="ml-4 text-[11px]">
                    + {m.name}
                    {m.options ? `: ${m.options.join(", ")}` : ""}
                  </div>
                ))}

                {/* Special notes — bold, visually prominent */}
                {item.notes && (
                  <div className="ml-4 text-[12px] font-bold italic">
                    ★ {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t-2 border-black border-dashed mb-2" />

          {/* Footer */}
          <div className="text-center text-[10px] text-gray-500">
            Tổng: {items.reduce((sum, i) => sum + i.quantity, 0)} món
          </div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body > *:not(.print\\:block) {
            display: none !important;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
      `,
        }}
      />
    </>
  );
}
